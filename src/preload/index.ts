import { contextBridge, ipcRenderer } from 'electron';

import type { Config, MainApi, PreloadApis, RendererApi } from "../shared-types";

const mainApiProxy: MainApi = {
  setTitle: (title: string) => ipcRenderer.send("setTitle", title),
  saveConfig: (config: Config) => ipcRenderer.invoke("saveConfig", config),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("setGreeting", (event, greeting) => rendererApi.setGreeting(greeting));
  ipcRenderer.on("showConfig", (event, config) => rendererApi.showConfig(config));
  ipcRenderer.on("showStatusText", (event, message) => rendererApi.showStatusText(message));
  ipcRenderer.on("showFiles", (event, files) => rendererApi.showFiles(files));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
