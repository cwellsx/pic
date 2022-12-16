import { Config, ConfigUI } from './config';
import { FileInfo } from './fileInfo';

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc

  If you change the MainApi interface then you should also change:
  - The mainApiProxy object in preload/index.ts
  - The bindIpcMain function in main/createApplication.ts
  - The MainApiImpl class in main/createApplication.ts

  If you change the RendererApi interface then you should also change:
  - The rendererApi object in main/createApplication.ts
  - The bindIpcRenderer object in preload/index.ts
  - The rendererApi object in renderer/App.tsx
*/

// this Api is implemented in the preload script and available to the renderer
export interface MainApi {
  setTitle: (title: string) => void;
  saveConfig: (config: Config) => Promise<Config>;
  saveConfigUI: (configUI: ConfigUI) => void;
}

// this Api is available to the main process and its functions are all void
export interface RendererApi {
  setGreeting: (greeting: string) => void;
  showConfig: (config: Config) => void;
  showConfigUI: (configUI: ConfigUI) => void;
  showStatusText: (message: string) => void;
  showFiles: (files: FileInfo[]) => void;
}

export type BindIpc = (rendererApi: RendererApi) => void;

export type PreloadApis = {
  mainApi: MainApi;
  bindIpc: BindIpc;
};
