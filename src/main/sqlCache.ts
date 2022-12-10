import { Database } from 'better-sqlite3';

import { FileInfo, FileProperties, FileStatus } from '../shared-types';
import { createSqlDatabase } from './createSqlDatabase';
import { SqlTable } from './sqlTable';

const cacheCaches = false;

const exemplars: {
  fileProperties: FileProperties;
  fileStatus: FileStatus;
} = {
  fileProperties: {
    contentType: "video/mp4",
    duration: 2463870000,
    width: 4032,
    height: 3024,
    rating: 50,
    ratingText: "3 Stars",
    keywords: '["Tagged Twice","Again"]',
    cameraModel: "iPhone 7",
    dateTaken: 1596617753840,
    latitudeDecimal: 48.99941944444444,
    longitudeDecimal: -1.0739138888888888,
    more: "",
  },
  fileStatus: {
    rootName: "documents",
    rootDir: "",
    leafDir: "",
    path: "",
    size: 1,
    mtimeMs: 1,
    birthtimeMs: 1,
  },
};

const exemplar: FileInfo = {
  thumbnailUrl: "",
  ...exemplars.fileProperties,
  ...exemplars.fileStatus,
};

export class SqlCache {
  read: (file: FileStatus) => FileInfo | undefined;
  save: (file: FileInfo) => void;
  done: () => void;

  constructor(db: Database) {
    const sqlTable = new SqlTable<FileInfo>(db, "fileinfo", "path", exemplar);
    const all = new Map<string, FileInfo>(sqlTable.selectAll().map((row) => [row.path, row]));

    this.read = (file: FileStatus) => {
      const found = all.get(file.path);
      return found && found.mtimeMs === file.mtimeMs && found.size === file.size ? found : undefined;
    };

    this.save = (file: FileInfo) => {
      const found = all.has(file.path);
      all.set(file.path, file);
      if (!found) sqlTable.insert(file);
      else sqlTable.update(file);
    };

    this.done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      console.log(`wal_checkpoint: ${JSON.stringify(result)}`);
      if (!cacheCaches) db.close;
    };
  }
}

const sqlCaches = new Map<string, SqlCache>();

export function createSqlCache(filename: string): SqlCache {
  const found = sqlCaches.get(filename);
  if (found) return found;
  const created = new SqlCache(createSqlDatabase(filename));
  if (!cacheCaches) sqlCaches.set(filename, created);
  return created;
}
