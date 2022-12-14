import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import fs from 'fs';
import path from 'path';

import { readConfig, readConfigUI, writeConfig, writeConfigUI } from './configFiles';
import { registerFileProtocol } from './convertPathToUrl';
import { createDotNetApi, DotNetApi } from './createDotNetApi';
import { selectCats } from './createSqlDatabase';
import { log, showNumber } from './log';
import { readFiles, validateConfig } from './readFiles';

import type { Config, ConfigUI, FileInfo, MainApi, RendererApi } from "../shared-types";
declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);
log(`cwd is ${process.cwd()}`);

export function createApplication(webContents: WebContents): void {
  registerFileProtocol();
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
  const cats: string[] = selectCats(getDbName());

  // implement RendererApi using webContents.send
  const rendererApi: RendererApi = {
    setGreeting: (greeting: string) => {
      webContents.send("setGreeting", greeting);
    },
    showConfig: (config: Config) => {
      webContents.send("showConfig", config);
    },
    showConfigUI: (configUI: ConfigUI) => {
      webContents.send("showConfigUI", configUI);
    },
    showStatusText: (message: string) => {
      webContents.send("showStatusText", message);
    },
    showFiles: (files: FileInfo[]) => {
      webContents.send("showFiles", files);
    },
  };

  function showFiles(config: Config): void {
    readFiles(config, rendererApi.showStatusText, dotNetApi)
      .then((files) => {
        log(`readFiles: found ${files.length} files`);
        rendererApi.showStatusText(`${showNumber(files.length)} files`);
        rendererApi.showFiles(files);
      })
      .catch((reason) => {
        log(`readFiles failed: ${"" + reason}`);
        rendererApi.showStatusText(`readFiles failed: ${"" + reason}`);
      });
  }

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
      config = validateConfig(config);
      writeConfig(config);
      showFiles(config);
      return Promise.resolve(config);
    }

    saveConfigUI(configUI: ConfigUI): void {
      log("saveConfigUI");
      writeConfigUI(configUI);
    }
  }

  function bindIpcMain() {
    // bind ipcMain to the methods of MainApiImpl
    ipcMain.on("setTitle", (event, title) => getApi(event).setTitle(title));
    ipcMain.handle("saveConfig", (event, config) => getApi(event).saveConfig(config));
    ipcMain.handle("saveConfigUI", (event, configUI) => getApi(event).saveConfigUI(configUI));

    function getApi(event: IpcMainEvent | IpcMainInvokeEvent): MainApi {
      const window = BrowserWindow.fromWebContents(event.sender);
      return new MainApiImpl(window);
    }
  }

  bindIpcMain();

  function onRendererLoaded(): void {
    log("readConfig");
    const config = readConfig();
    log("showConfig");
    rendererApi.showConfig(config);
    log("readConfigUI");
    const configUI = readConfigUI();
    log("showConfigUI");
    rendererApi.showConfigUI(configUI);
    showFiles(config);
  }

  function greetings(): void {
    log("getGreeting");
    dotNetApi.getGreeting("World").then((greeting: string) => {
      log(greeting);
      const names = cats.join(", ");
      log(names);
      rendererApi.setGreeting(`${greeting} from ${names}!`);
    });
  }

  webContents.once("did-finish-load", greetings);
  webContents.addListener("did-finish-load", onRendererLoaded);
}
