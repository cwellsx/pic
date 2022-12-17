import { app } from 'electron';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { Config, ConfigProperty, FileInfo, FileStatus, getDefaultConfig, Rooted } from '../shared-types';
import { readFileExtensions } from './configFiles';
import { convertPathToUrl } from './convertPathToUrl';
import { DotNetApi } from './createDotNetApi';
import { log } from './log';
import { createSqlCache } from './sqlCache';

/*
  I guess there's no point in multi-threading this using workers because it will be I/O-bound and not CPU-bound.

  The reason why this is a class is so that it can contain a cancelled member.
  This is used if the user changes the Config before the previous Reader has completed.
*/

// this is the list of folders for which we have verified that the list of files in SQL is up-to-date
const isFresh: Config = getDefaultConfig();

const isVerbose = false;
function verbose(message: string) {
  if (isVerbose) console.log(message);
}

type Context = {
  readonly resolve: (value: FileInfo[]) => void;
  readonly reject: (reason?: unknown) => void;
  readonly showStatusText: (message: string) => void;
  readonly dotNetApi: DotNetApi;
};

type RootedFiles = {
  rooted: Rooted;
  result: FileStatus[];
};

const thumbnailDirectories = new Set<string>();

function getDirExists(rootDir: string): boolean {
  try {
    const stat = fsSync.statSync(rootDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function getThumbnailExists(thumbnailPath: string, fileStatus: FileStatus): Promise<boolean> {
  try {
    const stat = await fs.stat(thumbnailPath);
    return stat.mtimeMs > fileStatus.mtimeMs;
  } catch {
    return false;
  }
}

async function getThumbnailDir(rooted: Rooted): Promise<string> {
  const directory = path.join(rooted.rootDir + ".pic", path.relative(rooted.rootDir, rooted.leafDir));
  if (!thumbnailDirectories.has(directory)) {
    verbose(`creating directory ${directory}`);
    await fs.mkdir(directory, { recursive: true });
    thumbnailDirectories.add(directory);
  }
  return directory;
}

async function getThumbnailPath(rooted: Rooted, filePath: string): Promise<string> {
  const filename = path.basename(filePath, path.extname(filePath)) + ".jpg";
  const directory = await getThumbnailDir(rooted);
  return path.join(directory, filename);
}

async function getDatabasePath(rooted: Rooted): Promise<string> {
  const directory = await getThumbnailDir(rooted);
  return path.join(directory, "pic.db");
}

class ReaderBase {
  cancelled = false;
  constructor(protected context: Context) {}
}

class ReadThumbnails extends ReaderBase {
  index = 0;
  total = 0;
  rooted: Rooted | undefined;
  intervalObj?: NodeJS.Timer;

  start(roots: RootedFiles[]): void {
    this.context.showStatusText("Reading thumbnails");
    this.startTimer();
    const promise = this.readAll(roots);
    promise
      .then((value) => this.context.resolve(value))
      .catch((reason) => this.context.reject(reason))
      .finally(() => {
        clearInterval(this.intervalObj);
        log(`finally ${this.cancelled} ${this === reader}`);
        if (this === reader) reader = undefined;
      });
  }

  private async readAll(roots: RootedFiles[]): Promise<FileInfo[]> {
    const result: FileInfo[] = [];
    for (const root of roots) await this.readRoot(root, result);
    return result;
  }

  private async readRoot(root: RootedFiles, result: FileInfo[]): Promise<void> {
    this.rooted = root.rooted;
    const files = root.result;
    this.total = files.length;
    const sqlCache = createSqlCache(await getDatabasePath(root.rooted));
    try {
      for (this.index = 0; this.index < this.total; ++this.index) {
        if (this.cancelled) throw new Error("cancelled");
        const fileStatus = files[this.index];
        const thumbnailPath = await getThumbnailPath(fileStatus, fileStatus.path);
        if (this.cancelled) throw new Error("cancelled");
        const isThumbnail = await getThumbnailExists(thumbnailPath, fileStatus);
        if (this.cancelled) throw new Error("cancelled");

        let fileInfo = sqlCache.read(fileStatus);
        if (!isThumbnail || !fileInfo) {
          verbose(`createThumbnail(${thumbnailPath}, ${!isThumbnail}, ${!fileInfo})`);
          try {
            const fileProperties = await this.context.dotNetApi.createThumbnail({
              path: fileStatus.path,
              thumbnailPath,
              wantThumbnail: !isThumbnail,
              wantProperties: !fileInfo,
            });
            verbose(`${thumbnailPath} created`);
            if (!fileInfo) {
              const thumbnailUrl = convertPathToUrl(thumbnailPath);
              verbose(`thumbnailUrl: ${thumbnailUrl}`);
              fileInfo = { ...fileProperties, ...fileStatus, thumbnailUrl };
              sqlCache.save(fileInfo);
            }
          } catch (e) {
            log(`${thumbnailPath} failed: ${e}`);
            continue;
          }
        } else verbose(`${thumbnailPath} already exists`);
        result.push(fileInfo);
      }
    } finally {
      sqlCache.done();
    }
  }

  private startTimer(): void {
    this.intervalObj = setInterval(() => this.showStatusText(), 1000);
  }

  private showStatusText(): void {
    const percent = Math.round((100 * this.index) / this.total);
    const name = this.rooted?.rootName ?? this.rooted?.rootDir;
    this.context.showStatusText(`Reading ${name} - ${percent}% (${this.index} of ${this.total})`);
  }
}

class ReadFiles extends ReaderBase {
  fileExtensions: Set<string> = new Set<string>(readFileExtensions());

  start(roots: RootedFiles[]): void {
    this.context.showStatusText("Reading files");
    const promise = this.readAll(roots);
    promise
      .then(() => {
        // change state: new reader instance is ReadThumbnails instead of ReadFiles
        const readFiles = new ReadThumbnails(this.context);
        reader = readFiles;
        readFiles.start(roots);
      })
      .catch((reason) => this.context.reject(reason))
      .finally(() => {
        log(`finally ${this.cancelled} ${this === reader}`);
        if (this === reader) reader = undefined;
      });
  }

  private async readAll(roots: RootedFiles[]): Promise<void> {
    const promises = roots.map((rooted) => this.read(rooted));
    await Promise.all(promises);
  }

  private async read(root: RootedFiles): Promise<void> {
    const rooted = root.rooted;
    const dir = rooted.leafDir;
    verbose(`read: ${dir}`);
    if (this.cancelled) throw new Error("cancelled");
    const found = await fs.readdir(dir, { encoding: "utf-8", withFileTypes: true });
    const subroots: RootedFiles[] = [];
    // use for of not forEach - https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
    for (const dirent of found) {
      if (this.cancelled) throw new Error("cancelled");
      const name = path.join(dir, dirent.name);
      verbose(`found: ${name}`);
      if (dirent.isFile()) {
        if (!this.isWantedExtension(dirent.name)) continue;
        const stat = await fs.stat(name);
        const fileStatus: FileStatus = {
          path: name,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          birthtimeMs: stat.birthtimeMs,
          ...rooted,
        };
        root.result.push(fileStatus);
      } else if (dirent.isDirectory() && dirent.name !== ".pic")
        // same array of result, similar rooted except different leafDir
        subroots.push({ rooted: { ...rooted, leafDir: name }, result: root.result });
    }
    await this.readAll(subroots);
  }

  private isWantedExtension(name: string): boolean {
    const ext = path.extname(name);
    if (!ext) return false;
    return this.fileExtensions.has(ext.slice(1).toLowerCase());
  }
}

let reader: ReaderBase | undefined = undefined;

export function readFiles(
  config: Config,
  showStatusText: (message: string) => void,
  dotNetApi: DotNetApi
): Promise<FileInfo[]> {
  // cancel any existing reader
  if (reader) {
    log("cancelling");
    reader.cancelled = true;
    reader = undefined;
  }

  // see which keys are wanted and need to be refreshed
  const wanted = { ...config };
  let needsRefreshing = false;
  Object.keys(wanted.paths).forEach((key) => {
    const name: ConfigProperty = key as ConfigProperty;
    if (wanted.paths[name]) {
      if (isFresh.paths[name]) wanted.paths[name] = false; // this path has already been refreshed
      else needsRefreshing = true;
    }
  });

  // instantiate the RootedFile instances
  const roots: RootedFiles[] = [];
  Object.keys(config.paths).forEach((key) => {
    const name: ConfigProperty = key as ConfigProperty;
    if (config.paths[name]) {
      const dir = app.getPath(name);
      const rooted: Rooted = { rootName: name, rootDir: dir, leafDir: dir };
      roots.push({ rooted, result: [] });
    }
  });
  config.more?.forEach((tuple) => {
    const [path, enabled, exists] = tuple;
    if (enabled && exists) {
      const rooted: Rooted = { rootName: null, rootDir: path, leafDir: path };
      roots.push({ rooted, result: [] });
    }
  });

  // create and start a new reader
  const result = new Promise<FileInfo[]>((resolve, reject) => {
    const context: Context = { resolve, reject, showStatusText, dotNetApi };
    const readFiles = new ReadFiles(context);
    reader = readFiles;
    readFiles.start(roots);
  });
  // this Promise will be resolved or rejected by the Reader
  return result;
}

export function validateConfig(config: Config): Config {
  if (!config.more) return config;
  for (const tuple of config.more) {
    const rootDir = tuple[0];
    const exists = getDirExists(rootDir);
    tuple[2] = exists;
  }
  return config;
}
