import { Database } from 'better-sqlite3';

type columnType = "TEXT" | "INT" | "REAL";

function getColumnType(value: unknown): columnType {
  switch (typeof value) {
    case "string":
      return "TEXT";
    case "number":
      return Number.isInteger(value) ? "INT" : "REAL";
    default:
      throw Error("Unsupported type");
  }
}

function getColumnDefinition(entry: [string, undefined], constraint: string): string {
  return `${entry[0]} ${getColumnType(entry[1])} ${constraint}`;
}

const isVerbose = false;
function verbose(message: string) {
  if (isVerbose) console.log(message);
}

export class SqlTable<T extends object> {
  // we need to list of keys in T to create corresponding SQL columns
  // but type info is only available at compile-time, it doesn't exist at run-time
  // so instead this API expects a sample run-time instance of T
  constructor(
    db: Database,
    tableName: string,
    primaryKey: keyof T,
    isNullable: ((key: keyof T) => boolean) | boolean,
    t: T
  ) {
    // do everything using arrow functions in the constructor, avoid using this anywhere
    // https://github.com/WiseLibs/better-sqlite3/issues/589#issuecomment-1336812715
    if (typeof primaryKey !== "string") throw new Error("primaryKey must be a string");

    function isKeyNullable(key: string): boolean {
      if (typeof isNullable === "boolean") return isNullable;
      return isNullable(key as keyof T);
    }

    const entries = Object.entries(t);
    const columnDefs = entries.map((entry) => {
      const key = entry[0];
      const constraint = key === primaryKey ? "NOT NULL PRIMARY KEY" : !isKeyNullable(key) ? "NOT NULL" : "";
      return getColumnDefinition(entry, constraint);
    });
    const createTable = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs.join(", ")})`;
    db.prepare(createTable).run();

    const keys = Object.keys(t);
    const values = keys.map((key) => `@${key}`);
    const insert = `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${values.join(", ")})`;
    const insertStmt = db.prepare(insert);

    const index = keys.indexOf(primaryKey);
    if (index === -1) throw new Error("primaryKey not found");
    keys.splice(index, 1);
    values.splice(index, 1);
    const update = `UPDATE ${tableName} SET (${keys.join(", ")}) = (${values.join(
      ", "
    )}) WHERE ${primaryKey} = @${primaryKey}`;
    const updateStmt = db.prepare(update);

    this.insert = db.transaction((t: T) => {
      const info = insertStmt.run(t);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`inserted row #${info.lastInsertRowid}`);
    });
    this.update = db.transaction((t: T) => {
      const info = updateStmt.run(t);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`updated row #${info.lastInsertRowid}`);
    });
    this.insertMany = db.transaction((many: T[]) => {
      for (const t of many) insertStmt.run(t);
    });

    const selectStmt = db.prepare(`SELECT * FROM ${tableName}`);
    this.selectAll = () => selectStmt.all();
  }

  insert: (t: T) => void;
  update: (t: T) => void;
  insertMany: (many: T[]) => void;
  selectAll: () => T[];
}
