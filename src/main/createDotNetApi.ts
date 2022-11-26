import { ConnectionBuilder } from 'electron-cgi';

import { log } from './log';

// this API is implemented by the C#
export type ThumbnailRequest = {
  path: string;
  thumbnailPath: string;
};

export interface DotNetApi {
  getGreeting: (name: string) => Promise<string>;
  createThumbnail: (request: ThumbnailRequest) => Promise<boolean>;
}

export function createDotNetApi(command: string, ...args: string[]): DotNetApi {
  // instantiate the Connection instance
  const connection = new ConnectionBuilder().connectTo(command, ...args).build();

  // use the connection instance to implement the API
  const dotNetApi = {
    getGreeting(name: string): Promise<string> {
      return connection.send("getGreeting", name) as Promise<string>;
    },
    createThumbnail(request: ThumbnailRequest): Promise<boolean> {
      return connection.send("createThumbnail", request) as Promise<boolean>;
    },
  };

  connection.onDisconnect = () => {
    log("core disconnected");
  };

  return dotNetApi;
}
