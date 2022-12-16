import './app.sass';

import * as React from 'react';

import { ConfigUI, FileInfo, getDefaultConfig } from '../shared-types';
import { EditConfig } from './EditConfig';
import { EditSize } from './EditSize';
import { ShowFiles } from './ShowFiles';
import { ShowFonts } from './ShowFonts';
import { ShowGreeting } from './ShowGreeting';
import { StatusBar } from './StatusBar';

import type { BindIpc, Config, MainApi, PreloadApis, RendererApi } from "../shared-types";
declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

export const mainApi: MainApi = window.preloadApis.mainApi;
export const bindIpc: BindIpc = window.preloadApis.bindIpc;

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState("Hello...");

  const [config, setConfig] = React.useState<Config>(getDefaultConfig());
  const [configUI, setConfigUI] = React.useState<ConfigUI>({});
  const [status, setStatus] = React.useState<string>("Ready");
  const [files, setFiles] = React.useState<FileInfo[]>([]);

  // React.useEffect(() => {
  //   setStatus(root);
  // }, [root]);

  // define the API to pass to the bindIpc function
  // use useEffect so that we only do this once
  React.useEffect(() => {
    const rendererApi: RendererApi = {
      setGreeting(greeting: string): void {
        setGreeting(greeting);
        mainApi.setTitle(greeting);
      },
      showConfig(config: Config): void {
        setConfig(config);
      },
      showConfigUI(configUI: ConfigUI): void {
        setConfigUI(configUI);
      },
      showStatusText(message: string): void {
        setStatus(message);
      },
      showFiles(files: FileInfo[]): void {
        setFiles(files);
      },
    };
    bindIpc(rendererApi);
  }, []);

  const saveConfig = async (config: Config): Promise<void> => {
    // pass the new config to the main process and afterwards into local state
    const returned = await mainApi.saveConfig(config);
    setConfig(returned);
  };

  const saveConfigUI = async (configUI: ConfigUI): Promise<void> => {
    // pass the new config to the main process but don't wait for that to complete
    mainApi.saveConfigUI(configUI);
    setConfigUI(configUI);
  };

  return (
    <React.StrictMode>
      <div id="settings">
        Settings
        <EditConfig config={config} setConfig={saveConfig} />
        <ShowFonts />
        <EditSize configUI={configUI} setConfigUI={saveConfigUI} />
      </div>
      <div id="footer">
        <StatusBar status={status} />
      </div>
      <div id="main">
        <ShowGreeting greeting={greeting} />
        <ShowFiles files={files} />
      </div>
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
