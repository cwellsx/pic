import { ConfigProperty } from './config';

export type Rooted = {
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
  readonly thumbnailUrl: string;
};
