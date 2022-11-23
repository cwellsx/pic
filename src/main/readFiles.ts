import { app } from 'electron';
import fs from 'fs';
import path from 'path';

import { Config, ConfigProperty, getDefaultConfig } from '../shared-types';
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
  rootName: ConfigProperty | null;
  rootPath: string;
  dir: string;
};

export type FileInfo = {
  path: string;
  size: number; // size in bytes
  mtimeMs: number; // modified time
  birthtimeMs: number; // created time
  rooted: Rooted;
};

type Context = {
  resolve: (value: FileInfo[]) => void;
  reject: (reason?: unknown) => void;
  setStatusText: (message: string) => void;
};

class ReaderBase {
  cancelled = false;
  constructor(protected context: Context) {}
}

class ReadThumbs extends ReaderBase {
  start(config: Config, files: FileInfo[]): void {}
}

class ReadFiles extends ReaderBase {
  result: FileInfo[] = [];

  start(config: Config): void {
    this.context.setStatusText("Reading files");
    const roots: Rooted[] = [];
    Object.keys(config.paths).forEach((key) => {
      const name: ConfigProperty = key as ConfigProperty;
      if (config.paths[name]) {
        const path = app.getPath(name);
        roots.push({ rootName: name, rootPath: path, dir: path });
      }
    });
    const promise = this.readAll(roots);
    promise
      .then(() => this.context.resolve(this.result))
      .catch((reason) => this.context.reject(reason))
      .finally(() => {
        log(`finally ${this.cancelled} ${this === reader}`);
        if (this === reader) reader = undefined;
      });
  }

  private async readAll(roots: Rooted[]): Promise<void> {
    const promises = roots.map((rooted) => this.read(rooted));
    await Promise.all(promises);
  }

  private async read(rooted: Rooted): Promise<void> {
    const dir = rooted.dir;
    verbose(`read: ${dir}`);
    if (this.cancelled) throw new Error("cancelled");
    const found = await fs.promises.readdir(dir, { encoding: "utf-8", withFileTypes: true });
    const roots: Rooted[] = [];
    // use for of not forEach - https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
    for (const dirent of found) {
      if (this.cancelled) throw new Error("cancelled");
      const name = path.join(dir, dirent.name);
      verbose(`found: ${name}`);
      if (dirent.isFile()) {
        const stat = await fs.promises.stat(name);
        const fileInfo: FileInfo = {
          path: name,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          birthtimeMs: stat.birthtimeMs,
          rooted,
        };
        this.result.push(fileInfo);
      } else if (dirent.isDirectory()) roots.push({ ...rooted, dir: name });
    }
    await this.readAll(roots);
  }
}

let reader: ReaderBase | undefined = undefined;

export function readFiles(config: Config, setStatusText: (message: string) => void): Promise<FileInfo[]> {
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
    const context: Context = { resolve, reject, setStatusText };
    const readFiles = new ReadFiles(context);
    reader = readFiles;
    readFiles.start(config);
  });
  // this Promise will be resolved or rejected by the Reader
  return result;
}
