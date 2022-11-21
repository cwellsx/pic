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

const isVerbose = true;
function verbose(message: string) {
  if (isVerbose) console.log(message);
}

export type FileInfo = {
  path: string;
  size: number; // size in bytes
  mtimeMs: number; // modified time
  birthtimeMs: number; // created time
};

class Reader {
  cancelled: boolean;
  result: FileInfo[];
  config: Config;
  resolve: (value: FileInfo[]) => void;
  reject: (reason?: unknown) => void;

  constructor(config: Config, resolve: (value: FileInfo[]) => void, reject: (reason?: unknown) => void) {
    this.cancelled = false;
    this.result = [];
    this.config = config;
    this.resolve = resolve;
    this.reject = reject;
  }

  start(): void {
    const dirs: string[] = [];
    Object.keys(this.config.paths).forEach((key) => {
      const name: ConfigProperty = key as ConfigProperty;
      if (this.config.paths[name]) {
        const path = app.getPath(name);
        dirs.push(path);
      }
    });
    const promise = this.readAll(dirs);
    promise
      .then(() => this.resolve(this.result))
      .catch((reason) => this.reject(reason))
      .finally(() => {
        log(`finally ${this.cancelled} ${this === reader}`);
        if (this === reader) reader = undefined;
      });
  }

  private async readAll(dirs: string[]): Promise<void> {
    verbose(`readAll: ${dirs.join("\r\n")}`);
    const promises = dirs.map((path) => this.read(path));
    await Promise.all(promises);
  }

  private async read(dir: string): Promise<void> {
    verbose(`read: ${dir}`);
    if (this.cancelled) throw new Error("cancelled");
    const found = await fs.promises.readdir(dir, { encoding: "utf-8", withFileTypes: true });
    const dirs: string[] = [];
    found.forEach(async (dirent) => {
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
        };
        this.result.push(fileInfo);
      } else if (dirent.isDirectory()) dirs.push(name);
    });
    await this.readAll(dirs);
  }
}

let reader: Reader | undefined = undefined;

export function readFiles(config: Config): Promise<FileInfo[]> {
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
    reader = new Reader(config, resolve, reject);
    reader.start();
  });
  // this Promise will be resolved or rejected by the Reader
  return result;
}
