import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import fs from 'fs';
import path from 'path';

import { readConfig, writeConfig } from './configurationFile';
import { createDotNetApi, DotNetApi } from './createDotNetApi';
import { createSqlDatabase, SqlApi } from './createSqlDatabase';
import { log, showNumber } from './log';
import { readFiles } from './readFiles';

import type { Config, MainApi, RendererApi } from "../shared-types";
declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);
log(`cwd is ${process.cwd()}`);

export function createApplication(webContents: WebContents): void {
  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // instantiate the SqlApi
  const getDbName = (): string => {
    // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
    // says that, "it is not recommended to write large files here"
    const dir = app.getPath("userData");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return path.join(dir, "pic.db");
  };
  const sqlApi: SqlApi = createSqlDatabase(getDbName());

  // implement RendererApi using webContents.send
  const rendererApi: RendererApi = {
    setGreeting: (greeting: string) => {
      webContents.send("setGreeting", greeting);
    },
    showConfig: (config: Config) => {
      webContents.send("showConfig", config);
    },
    setStatusText: (message: string) => {
      webContents.send("setStatusText", message);
    },
  };

  // this is a light-weight class which implements the MainApi by binding it to BrowserWindow instance at run-time
  // a new instance of this class is created for each event
  class MainApiImpl implements MainApi {
    window: BrowserWindow | null;
    constructor(window: BrowserWindow | null) {
      this.window = window;
    }

    setTitle(title: string): void {
      log("setTitle");
      this.window?.setTitle(title);
    }

    saveConfig(config: Config): Promise<Config> {
      log("saveConfig");
      writeConfig(config);
      readFiles(config, rendererApi.setStatusText, dotNetApi)
        .then((paths) => {
          log(`readFiles: found ${paths.length} files`);
          rendererApi.setStatusText(`${showNumber(paths.length)} files`);
        })
        .catch((reason) => {
          log(`readFiles failed: ${"" + reason}`);
          rendererApi.setStatusText(`readFiles failed: ${"" + reason}`);
        });
      return Promise.resolve(config);
    }
  }

  function bindIpcMain() {
    // bind ipcMain to the methods of MainApiImpl
    ipcMain.on("setTitle", (event, title) => getApi(event).setTitle(title));
    ipcMain.handle("saveConfig", (event, config) => getApi(event).saveConfig(config));

    function getApi(event: IpcMainEvent | IpcMainInvokeEvent): MainApi {
      const window = BrowserWindow.fromWebContents(event.sender);
      return new MainApiImpl(window);
    }
  }

  bindIpcMain();

  function onRendererLoaded(): void {
    log("get/showConfig");
    const config = readConfig();
    rendererApi.showConfig(config);

    log("getGreeting");
    dotNetApi.getGreeting("World").then((greeting: string) => {
      log(greeting);
      const names = sqlApi.selectNames().join(", ");
      log(names);
      rendererApi.setGreeting(`${greeting} from ${names}!`);
    });
  }

  webContents.once("did-finish-load", onRendererLoaded);
}
