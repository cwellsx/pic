import { ConnectionBuilder } from 'electron-cgi';

import { stringToArray, trimString } from '../shared-types';
import { log, logf } from './log';

import type { FileProperties } from "../shared-types";

// this API is implemented by the C#
export type ThumbnailRequest = {
  path: string;
  thumbnailPath: string;
  wantThumbnail: boolean;
  wantProperties: boolean;
};

type ThumbnailResponse = {
  properties: string;
  exception: string;
};

export interface DotNetApi {
  getGreeting: (name: string) => Promise<string>;
  createThumbnail: (request: ThumbnailRequest) => Promise<FileProperties>;
}

/*
  The properties received from C# are lines of tab-separated key/value pairs like this

ContentType	"video/mp4"
Media.Duration	2463870000
Rating	50
RatingText	"3 Stars"
Video.FrameHeight	1080
Video.FrameWidth	1920

ContentType	"image/jpeg"
GPS.LatitudeDecimal	48.99941944444444
GPS.LongitudeDecimal	-1.0739138888888888
Image.HorizontalSize	4032
Image.VerticalSize	3024
Keywords	["Tagged Twice","Again"]
Photo.CameraModel	"iPhone 7"
Photo.DateTaken	1596617753840

*/

function readFileProperties(properties: string): FileProperties {
  const lines = properties.split("\r\n").map((line) => line.split("\t"));

  function read(key: string): string | undefined {
    const index = lines.findIndex((line) => line[0] === key);
    if (index === -1) return undefined;
    const result = lines[index][1];
    lines.splice(index, 1);
    return result;
  }

  function readString(key: string): string {
    const result = read(key);
    if (!result) return "";
    return trimString(result);
  }

  function readInteger(key: string): number {
    const result = read(key);
    if (!result) return 0;
    return parseInt(result);
  }

  function readFloat(key: string): number {
    const result = read(key);
    if (!result) return 0;
    return parseFloat(result);
  }

  function readArray(key: string): string {
    const result = read(key);
    if (!result) return "";
    // assert that it can be parsed but don't parse it
    stringToArray(result);
    return result;
  }

  const contentType = readString("ContentType");
  const duration = readInteger("Duration");
  const width = readInteger("Image.HorizontalSize") ?? readInteger("Video.FrameWidth");
  const height = readInteger("Image.VerticalSize") ?? readInteger("Video.FrameHeight");
  const rating = readInteger("Rating");
  const ratingText = readString("RatingText");
  const keywords = readArray("Keywords");
  const cameraModel = readString("CameraModel");
  const dateTaken = readInteger("DateTaken");
  const latitudeDecimal = readFloat("GPS.LatitudeDecimal");
  const longitudeDecimal = readFloat("GPS.LongitudeDecimal");
  const more = lines.length > 0 ? lines.map((line) => line.join("\t")).join("\r\n") : "";
  return {
    contentType,
    duration,
    width,
    height,
    rating,
    ratingText,
    keywords,
    cameraModel,
    dateTaken,
    latitudeDecimal,
    longitudeDecimal,
    more,
  };
}

export function createDotNetApi(command: string, ...args: string[]): DotNetApi {
  // instantiate the Connection instance
  const connection = new ConnectionBuilder().connectTo(command, ...args).build();

  // use the connection instance to implement the API
  const dotNetApi = {
    getGreeting(name: string): Promise<string> {
      return connection.send("getGreeting", name) as Promise<string>;
    },
    async createThumbnail(request: ThumbnailRequest): Promise<FileProperties> {
      // testing with logf shows that main process and CGI are efficient
      // most time is spent in the Core implementation
      // there's no performance gain to be had e.g. by batching multiple requests per roundtrip
      logf(`ThumbnailRequest(${request.path})`);
      const result = (await connection.send("createThumbnail", request)) as ThumbnailResponse;
      logf(`ThumbnailResponse(${request.path}) ${result.exception ? "FAIL" : "OK"}`);
      if (result.exception) {
        log(result.exception);
        throw new Error(result.exception);
      }
      return readFileProperties(result.properties);
    },
  };

  connection.onDisconnect = () => {
    log("core disconnected");
  };

  return dotNetApi;
}
