import { ConfigProperty } from './config';

export type Rooted = {
  readonly rootName: ConfigProperty | null;
  readonly rootDir: string;
  readonly leafDir: string;
};

export type FileStatus = Rooted & {
  readonly path: string;
  readonly size: number; // size in bytes
  readonly mtimeMs: number; // modified time
  readonly birthtimeMs: number; // created time
};

export type FileProperties = {
  contentType: string;
  duration: number;
  width: number;
  height: number;
  rating: number;
  ratingText: string;
  keywords: string;
  cameraModel: string;
  dateTaken: number;
  latitudeDecimal: number;
  longitudeDecimal: number;
  more: string;
};

export type FileInfo = FileStatus &
  FileProperties & {
    readonly thumbnailUrl: string;
  };
