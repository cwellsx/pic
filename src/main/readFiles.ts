import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

import { Config, ConfigProperty, FileInfo, FileStatus, getDefaultConfig, Rooted } from '../shared-types';
import { readFileExtensions } from './configurationFile';
import { convertPathToUrl } from './convertPathToUrl';
import { DotNetApi } from './createDotNetApi';
import { log } from './log';

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

type RootedFiles<T> = {
  rooted: Rooted;
  result: T[];
};

const thumbnailDirectories = new Set<string>();

class ReaderBase {
  cancelled = false;
  constructor(protected context: Context) {}
}

class ReadThumbnails extends ReaderBase {
  index = 0;
  total = 0;
  rooted: Rooted | undefined;
  intervalObj?: NodeJS.Timer;

  start(roots: RootedFiles<FileStatus>[]): void {
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

  private async readAll(roots: RootedFiles<FileStatus>[]): Promise<FileInfo[]> {
    const result: FileInfo[] = [];
    for (const root of roots) await this.readRoot(root, result);
    return result;
  }

  private async readRoot(root: RootedFiles<FileStatus>, result: FileInfo[]): Promise<void> {
    this.rooted = root.rooted;
    const files = root.result;
    this.total = files.length;
    for (this.index = 0; this.index < this.total; ++this.index) {
      if (this.cancelled) throw new Error("cancelled");
      const fileStatus = files[this.index];
      const thumbnailPath = await ReadThumbnails.getThumbnailPath(fileStatus.rooted, fileStatus.path);
      if (this.cancelled) throw new Error("cancelled");
      const isThumbnail = await ReadThumbnails.isThumbnail(thumbnailPath, fileStatus);
      if (this.cancelled) throw new Error("cancelled");
      const isProperties = false;
      if (!isThumbnail || !isProperties) {
        verbose(`createThumbnail(${thumbnailPath})`);
        const response = await this.context.dotNetApi.createThumbnail({
          path: fileStatus.path,
          thumbnailPath,
          wantThumbnail: !isThumbnail,
          wantProperties: !isProperties,
        });
        if (!response.exception) verbose(`${thumbnailPath} created`);
        else verbose(`${thumbnailPath} failed`);
      } else verbose(`${thumbnailPath} already exists`);
      const thumbnailUrl = convertPathToUrl(thumbnailPath);
      verbose(`thumbnailUrl: ${thumbnailUrl}`);
      result.push({ ...fileStatus, thumbnailUrl });
    }
  }

  private startTimer(): void {
    this.intervalObj = setInterval(() => {
      verbose("setInterval is running");
      const percent = Math.round((100 * this.index) / this.total);
      const name = this.rooted?.rootName ?? this.rooted?.rootDir;
      this.context.showStatusText(`Reading ${name} - ${percent}% (${this.index} of ${this.total})`);
      verbose("setInterval is returning");
    }, 1000);
  }

  private static async isThumbnail(thumbnailPath: string, fileStatus: FileStatus): Promise<boolean> {
    try {
      const stat = await fs.stat(thumbnailPath);
      return stat.mtimeMs > fileStatus.mtimeMs;
    } catch {
      return false;
    }
  }

  private static async getThumbnailPath(rooted: Rooted, filePath: string): Promise<string> {
    const filename = path.basename(filePath, path.extname(filePath)) + ".jpg";
    const directory = path.join(rooted.rootDir, ".pic", path.relative(rooted.rootDir, rooted.leafDir));
    if (!thumbnailDirectories.has(directory)) {
      verbose(`creating directory ${directory}`);
      await fs.mkdir(directory, { recursive: true });
      thumbnailDirectories.add(directory);
    }
    return path.join(directory, filename);
  }
}

class ReadFiles extends ReaderBase {
  fileExtensions: Set<string> = new Set<string>(readFileExtensions());

  start(roots: RootedFiles<FileStatus>[]): void {
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

  private async readAll(roots: RootedFiles<FileStatus>[]): Promise<void> {
    const promises = roots.map((rooted) => this.read(rooted));
    await Promise.all(promises);
  }

  private async read(data: RootedFiles<FileStatus>): Promise<void> {
    const rooted = data.rooted;
    const dir = rooted.leafDir;
    verbose(`read: ${dir}`);
    if (this.cancelled) throw new Error("cancelled");
    const found = await fs.readdir(dir, { encoding: "utf-8", withFileTypes: true });
    const roots: RootedFiles<FileStatus>[] = [];
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
          rooted,
        };
        data.result.push(fileStatus);
      } else if (dirent.isDirectory() && dirent.name !== ".pic")
        // same array of result, similar rooted except different leafDir
        roots.push({ rooted: { ...rooted, leafDir: name }, result: data.result });
    }
    await this.readAll(roots);
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
  const roots: RootedFiles<FileStatus>[] = [];
  Object.keys(config.paths).forEach((key) => {
    const name: ConfigProperty = key as ConfigProperty;
    if (config.paths[name]) {
      const dir = app.getPath(name);
      const rooted: Rooted = { rootName: name, rootDir: dir, leafDir: dir };
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
