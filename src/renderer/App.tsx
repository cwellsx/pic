import './app.sass';

import * as React from 'react';

import { ConfigUI, FileInfo, getDefaultConfig } from '../shared-types';
import { EditConfig } from './EditConfig';
import { EditSize } from './EditSize';
import { reducer } from './reducer';
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

// must invoke bindIpc a.s.a.p. because main will invoke functions when the "did-finish-load" event is run.
// if we invoke bindIpc in useEffects hook then that's too late i.e. after the main function has made API calls
// so this emulates a constructor, see https://dev.to/bytebodger/constructors-in-functional-components-with-hooks-280m

const useConstructor = (callBack: () => void): void => {
  // this hook invokes the callback immedately once and only once
  const [hasBeenCalled, setHasBeenCalled] = React.useState(false);
  if (hasBeenCalled) return;
  callBack();
  setHasBeenCalled(true);
};

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState("Hello...");

  const [config, setConfig] = React.useState<Config>(getDefaultConfig());
  const [configUI, setConfigUI] = React.useState<ConfigUI>({});
  const [status, setStatus] = React.useState<string>("Ready");
  const [state, dispatch] = React.useReducer(reducer, { files: [], selected: [], previousSelection: undefined });

  // React.useEffect(() => {
  //   setStatus(root);
  // }, [root]);

  // define the API to pass to the bindIpc function
  // use useConstructor so that we do this immediately but only do this once
  useConstructor(() => {
    const rendererApi: RendererApi = {
      setGreeting(greeting: string): void {
        setGreeting(greeting);
        mainApi.setTitle(greeting);
      },
      showConfig(config: Config): void {
        console.log(`setConfig(${JSON.stringify(config)})`);
        setConfig(config);
      },
      showConfigUI(configUI: ConfigUI): void {
        setConfigUI(configUI);
      },
      showStatusText(message: string): void {
        setStatus(message);
      },
      showFiles(files: FileInfo[]): void {
        dispatch({ type: "SetFiles", files });
      },
    };
    bindIpc(rendererApi);
  });

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
        <ShowFiles state={state} dispatch={dispatch} />
      </div>
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
