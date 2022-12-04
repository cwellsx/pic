import { ConnectionBuilder } from 'electron-cgi';

import { log } from './log';

// this API is implemented by the C#
export type ThumbnailRequest = {
  path: string;
  thumbnailPath: string;
  wantThumbnail: boolean;
  wantProperties: boolean;
};

export type ThumbnailResponse = {
  properties: string;
  exception: string;
};

export interface DotNetApi {
  getGreeting: (name: string) => Promise<string>;
  createThumbnail: (request: ThumbnailRequest) => Promise<ThumbnailResponse>;
}

export function createDotNetApi(command: string, ...args: string[]): DotNetApi {
  // instantiate the Connection instance
  const connection = new ConnectionBuilder().connectTo(command, ...args).build();

  // use the connection instance to implement the API
  const dotNetApi = {
    getGreeting(name: string): Promise<string> {
      return connection.send("getGreeting", name) as Promise<string>;
    },
    createThumbnail(request: ThumbnailRequest): Promise<ThumbnailResponse> {
      return connection.send("createThumbnail", request) as Promise<ThumbnailResponse>;
    },
  };

  connection.onDisconnect = () => {
    log("core disconnected");
  };

  return dotNetApi;
}
