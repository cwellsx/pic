import './app.sass';

import * as React from 'react';

import { getDefaultConfig } from '../shared-types';
import { Dashboard } from './Dashboard';
import { EditConfig } from './EditConfig';
import { RootPicker } from './RootPicker';
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

  const [root, setRoot] = React.useState<string>("");
  const [config, setConfig] = React.useState<Config>(getDefaultConfig());
  const [status, setStatus] = React.useState<string>("Ready");

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
      setStatusText(message: string): void {
        setStatus(message);
      },
    };
    bindIpc(rendererApi);
  });

  const saveConfig = async (config: Config): Promise<void> => {
    // pass the new config to the main process and afterwards into local state
    // mainApi.saveConfig(config);
    const returned = await mainApi.saveConfig(config);
    setConfig(returned);
  };

  return (
    <React.StrictMode>
      <div id="settings">
        Settings
        <EditConfig config={config} setConfig={saveConfig} />
      </div>
      <div id="footer">
        <StatusBar status={status} />
      </div>
      <div id="main">
        <Dashboard greeting={greeting} />
      </div>

      <RootPicker root={root} setRoot={setRoot} />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
