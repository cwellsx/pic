import sqlite from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { SqlTable } from './sqlTable';

// https://github.com/electron-userland/electron-forge/issues/1224#issuecomment-606649565
// https://www.npmjs.com/package/better-sqlite3
// https://github.com/electron-userland/electron-forge/issues?q=is%3Aissue+is%3Aopen+sqlite
// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md

export interface SqlApi {
  selectCats(): string[];
}

type Cat = {
  name: string;
  age: number;
};

export function createSqlDatabase(filename: string): SqlApi {
  // specify location of better_sqlite3.node -- https://github.com/electron/forge/issues/3052
  const nativeBinding = path.join(process.cwd(), ".webpack\\main\\native_modules\\build\\Release\\better_sqlite3.node");
  const options: sqlite.Options | undefined = fs.existsSync(nativeBinding)
    ? {
        nativeBinding,
      }
    : undefined;

  const db = sqlite(filename, options);

  const catTable = new SqlTable<Cat>(db, "cat", "name", { name: "name", age: 1 });

  let rows = catTable.selectAll();

  if (!rows.length) {
    catTable.insertMany([
      { name: "Joey", age: 2 },
      { name: "Sally", age: 4 },
      { name: "Junior", age: 1 },
    ]);
    rows = catTable.selectAll();
  }

  rows.forEach((row) => {
    console.log(row);
  });

  return {
    selectCats: () => catTable.selectAll().map((cat) => `${cat.name} (${cat.age})`),
  };
}
