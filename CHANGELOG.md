### 2022-10-30

- Add the `strict` Typescript option
- Upgrade to the React 18 API

### 2022-10-21

- Begin to use SQLite -- use the `fix_electron20_build` branch of a fork of `better-sqlite3`
  because the mainstream version doesn't yet support Electron 20:
  - https://github.com/WiseLibs/better-sqlite3/issues/867#issuecomment-1277766794
  - https://github.com/WiseLibs/better-sqlite3/pull/870
  - https://github.com/neoxpert/better-sqlite3/tree/fix_electron20_build

### 2022-10-16

- Fork from the `dotnet` branch of my `electron_forge_template` project:
  - https://github.com/cwellsx/electron_forge_template/tree/dotnet
