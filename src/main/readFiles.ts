import { app } from 'electron';
import fs from 'fs';
import path from 'path';

import { Config, ConfigProperty } from '../shared-types';
import { log } from './log';

/*
  I guess there's no point in multi-threading this using workers because it will be I/O-bound and not CPU-bound.

  The reason why this is a class is so that it can contain a cancelled member.
  This is used if the user changes the Config before the previous Reader has completed.
*/

const isVerbose = false;
function verbose(message: string) {
  if (isVerbose) console.log(message);
}

class Reader {
  cancelled: boolean;
  result: string[];
  config: Config;
  resolve: (value: string[]) => void;
  reject: (reason?: unknown) => void;

  constructor(config: Config, resolve: (value: string[]) => void, reject: (reason?: unknown) => void) {
    this.cancelled = false;
    this.result = [];
    this.config = config;
    this.resolve = resolve;
    this.reject = reject;
  }

  start(): void {
    const dirs: string[] = [];
    Object.keys(this.config.paths).map((key) => {
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
    found.forEach((dirent) => {
      if (this.cancelled) throw new Error("cancelled");
      const name = path.join(dir, dirent.name);
      verbose(`found: ${name}`);
      if (dirent.isFile()) this.result.push(name);
      else if (dirent.isDirectory()) dirs.push(name);
    });
    await this.readAll(dirs);
  }
}

let reader: Reader | undefined = undefined;

export function readFiles(config: Config): Promise<string[]> {
  // cancel any existing reader
  if (reader) {
    log("cancelling");
    reader.cancelled = true;
    reader = undefined;
  }
  // create and start a new reader
  const result = new Promise<string[]>((resolve, reject) => {
    reader = new Reader(config, resolve, reject);
    reader.start();
  });
  // this Promise will be resolved or rejected by the Reader
  return result;
}
