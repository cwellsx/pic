import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

import { Config, ConfigProperty, getDefaultConfig } from '../shared-types';
import { readFileExtensions } from './configurationFile';
import { DotNetApi } from './createDotNetApi';
import { log } from './log';

/*
  I guess there's no point in multi-threading this using workers because it will be I/O-bound and not CPU-bound.

  The reason why this is a class is so that it can contain a cancelled member.
  This is used if the user changes the Config before the previous Reader has completed.
*/

// this is the list of folders for which we have verified that the list of files in SQL is up-to-date
const isFresh: Config = getDefaultConfig();
let current: Config = getDefaultConfig();

const isVerbose = false;
function verbose(message: string) {
  if (isVerbose) console.log(message);
}

type Rooted = {
  readonly rootName: ConfigProperty | null;
  readonly rootDir: string;
  readonly leafDir: string;
};

export type FileStatus = {
  readonly path: string;
  readonly size: number; // size in bytes
  readonly mtimeMs: number; // modified time
  readonly birthtimeMs: number; // created time
  readonly rooted: Rooted;
};

export type FileInfo = FileStatus & {
  readonly thumbnailPath: string;
};

type Context = {
  readonly resolve: (value: FileInfo[]) => void;
  readonly reject: (reason?: unknown) => void;
  readonly setStatusText: (message: string) => void;
  readonly dotNetApi: DotNetApi;
};

const thumbnailDirectories = new Set<string>();

class ReaderBase {
  cancelled = false;
  constructor(protected context: Context) {}
}

class ReadThumbnails extends ReaderBase {
  index = 0;
  total = 0;
  intervalObj?: NodeJS.Timer;

  start(config: Config, files: FileStatus[]): void {
    this.context.setStatusText("Reading thumbnails");
    this.startTimer();
    this.total = files.length;
    const promise = this.readAll(config, files);
    promise
      .then((value) => this.context.resolve(value))
      .catch((reason) => this.context.reject(reason))
      .finally(() => {
        clearInterval(this.intervalObj);
        log(`finally ${this.cancelled} ${this === reader}`);
        if (this === reader) reader = undefined;
      });
  }

  private async readAll(config: Config, files: FileStatus[]): Promise<FileInfo[]> {
    const result: FileInfo[] = [];
    for (this.index = 0; this.index < this.total; ++this.index) {
      if (this.cancelled) throw new Error("cancelled");
      const fileStatus = files[this.index];
      const thumbnailPath = await ReadThumbnails.getThumbnailPath(fileStatus.rooted, fileStatus.path);
      if (this.cancelled) throw new Error("cancelled");
      const isThumbnail = await ReadThumbnails.isThumbnail(thumbnailPath, fileStatus);
      if (this.cancelled) throw new Error("cancelled");
      if (!isThumbnail) {
        verbose(`createThumbnail(${thumbnailPath})`);
        if (await this.context.dotNetApi.createThumbnail({ path: fileStatus.path, thumbnailPath }))
          verbose(`${thumbnailPath} created`);
        else verbose(`${thumbnailPath} failed`);
      } else verbose(`${thumbnailPath} already exists`);

      result.push({ ...fileStatus, thumbnailPath });
    }
    return result;
  }

  private startTimer(): void {
    this.intervalObj = setInterval(() => {
      verbose("setInterval is running");
      const percent = Math.round((100 * this.index) / this.total);
      this.context.setStatusText(`Reading thumbnails - ${percent}% (${this.index} of ${this.total})`);
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
  result: FileStatus[] = [];
  fileExtensions: Set<string> = new Set<string>(readFileExtensions());

  start(config: Config): void {
    this.context.setStatusText("Reading files");
    const roots: Rooted[] = [];
    Object.keys(config.paths).forEach((key) => {
      const name: ConfigProperty = key as ConfigProperty;
      if (config.paths[name]) {
        const dir = app.getPath(name);
        roots.push({ rootName: name, rootDir: dir, leafDir: dir });
      }
    });
    const promise = this.readAll(roots);
    promise
      .then(() => this.readThumbnails(config))
      .catch((reason) => this.context.reject(reason))
      .finally(() => {
        log(`finally ${this.cancelled} ${this === reader}`);
        if (this === reader) reader = undefined;
      });
  }

  private readThumbnails(config: Config) {
    // change state: new reader instance is ReadThumbnails instead of ReadFiles
    const readFiles = new ReadThumbnails(this.context);
    reader = readFiles;
    readFiles.start(config, this.result);
  }

  private async readAll(roots: Rooted[]): Promise<void> {
    const promises = roots.map((rooted) => this.read(rooted));
    await Promise.all(promises);
  }

  private async read(rooted: Rooted): Promise<void> {
    const dir = rooted.leafDir;
    verbose(`read: ${dir}`);
    if (this.cancelled) throw new Error("cancelled");
    const found = await fs.readdir(dir, { encoding: "utf-8", withFileTypes: true });
    const roots: Rooted[] = [];
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
        this.result.push(fileStatus);
      } else if (dirent.isDirectory() && dirent.name !== ".pic") roots.push({ ...rooted, leafDir: name });
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
  setStatusText: (message: string) => void,
  dotNetApi: DotNetApi
): Promise<FileInfo[]> {
  // cancel any existing reader
  if (reader) {
    log("cancelling");
    reader.cancelled = true;
    reader = undefined;
  }

  current = { ...config };
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

  // create and start a new reader
  const result = new Promise<FileInfo[]>((resolve, reject) => {
    const context: Context = { resolve, reject, setStatusText, dotNetApi };
    const readFiles = new ReadFiles(context);
    reader = readFiles;
    readFiles.start(config);
  });
  // this Promise will be resolved or rejected by the Reader
  return result;
}
