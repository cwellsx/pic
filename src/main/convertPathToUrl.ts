import { protocol } from 'electron';
import url from 'node:url';

/*
  https://github.com/electron/forge/issues/3098
*/

// use this to determine whether to hack behaviour because it's running from web server instead of from file system
const isRunningFromWebServer = __dirname.includes(".webpack");

// not defined in https://en.wikipedia.org/wiki/List_of_URI_schemes, used as a hack when running from web server
const schemeName = "local";
const scheme = `${schemeName}://`;

export const convertPathToUrl: (path: string) => string = (path: string) => {
  return !isRunningFromWebServer ? url.pathToFileURL(path).toString() : `${scheme}${encodeURIComponent(path)}`;
};

export function registerFileProtocol() {
  if (!isRunningFromWebServer) return;
  protocol.registerFileProtocol(schemeName, (request, callback) => {
    // undo the mangling that was done in convertPathToUrl
    const path = decodeURIComponent(request.url.slice(scheme.length));
    try {
      return callback(path);
    } catch (error) {
      console.error(`ERROR: registerFileProtocol: Could not get file path: error: ${error}, path: ${path}`);
    }
  });
}
