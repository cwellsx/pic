import './showProperties.sass';

import * as React from 'react';

import { FileInfo, stringToArray, trimString } from '../shared-types';
import { RenderedState } from './reducer';
import { getFilename } from './ShowFiles';

type ShowPropertiesProps = {
  state: RenderedState;
};

function getSingle<T>(files: FileInfo[], getProperty: (file: FileInfo) => T): T | undefined {
  const first: T = getProperty(files[0]);
  return files.every((file) => getProperty(file) === first) ? first : undefined;
}

function getPair<T>(files: FileInfo[], getPropertyPair: (file: FileInfo) => [T, T]): [T, T] | undefined {
  const first: [T, T] = getPropertyPair(files[0]);
  if (!first[0] && !first[1]) return undefined;
  return files.every((file) => {
    const pair: [T, T] = getPropertyPair(file);
    return pair[0] === first[0] && pair[1] === first[1];
  })
    ? first
    : undefined;
}

function showDate(when: number | undefined): string | undefined {
  if (!when) return undefined;
  const date = new Date(when);
  return date.toLocaleString();
}

function showTags(tags: string | undefined): string | undefined {
  if (!tags) return undefined;
  const result = stringToArray(tags);
  return result.join(", ");
}

function showDimensions(size: [number, number] | undefined): string | undefined {
  if (!size) return undefined;
  return `${size[0]} × ${size[1]}`;
}

function showGPS(size: [number, number] | undefined): string | undefined {
  if (!size) return undefined;
  const round: (n: number) => string = (n) => "" + Math.round(n * 100) / 100;
  return `${round(size[0])} × ${round(size[1])}`;
}

function showSize(size: number | undefined): string | undefined {
  if (!size) return undefined;
  if (size < 10000) return `${size} bytes`;
  const units = ["KB", "MB", "GB", "GB"];
  let i = 0;
  for (; i < 3; ++i) {
    if (size < 1024) break;
    size /= 1024;
  }
  return `${size > 1000 ? Math.round(size) : size.toPrecision(3)} ${units[i]}`;
}

function div(n: number, divisor: number): [result: number, remainder: number] {
  const result = Math.floor(n / divisor);
  const remainder = n % divisor;
  return [result, remainder];
}

function showDuration(duration: number | undefined): string | undefined {
  if (!duration) return undefined;
  const [seconds_, _] = div(duration, 10000000); // 100ns units, not milliseconds
  const [minutes_, seconds] = div(seconds_, 60);
  const [hours, minutes] = div(minutes_, 60);
  const pad: (n: number) => string = (n) => ("" + n).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

function showMore(more: string | undefined): [string, string?][] {
  if (!more) return [];
  const lines = more.split("\r\n");
  return lines.map((line) => {
    const split = line.split("\t");
    const value = split[1];
    const parsed =
      value.length == 0
        ? value
        : value[0] == "["
        ? stringToArray(value).join(", ")
        : value[0] == '"'
        ? trimString(value)
        : value;
    return [split[0], parsed];
  });
}

export const ShowProperties: React.FunctionComponent<ShowPropertiesProps> = (props: ShowPropertiesProps) => {
  const { state } = props;
  const selected: number[] = [];
  state.selected.forEach((value, index) => {
    if (value) selected.push(index);
  });
  if (selected.length === 0) return <></>;
  const first = state.files[selected[0]];
  const files = selected.map((index) => state.files[index]);
  const single = selected.length === 1;
  const title = single ? getFilename(first) : `${selected.length} items selected`;

  // contentType: string; .
  // duration: number;
  // width: number;
  // height: number;
  // rating: number;
  // ratingText: string;
  // keywords: string;
  // cameraModel: string;
  // dateTaken: number;
  // latitudeDecimal: number;
  // longitudeDecimal: number;
  // more: string;

  let properties: [string, string?][] = [
    // picture
    ["Date taken", showDate(getSingle(files, (file) => file.dateTaken))],
    ["Tags", showTags(getSingle(files, (file) => file.keywords))],
    // Rating	50
    // RatingText	"3 Stars"
    ["Rating", getSingle(files, (file) => file.ratingText)],
    // video
    ["Duration", showDuration(getSingle(files, (file) => file.duration))],
    ["Dimensions", showDimensions(getPair(files, (file) => [file.width, file.height]))],
    ["Size", showSize(getSingle(files, (file) => file.size))],
    // picture
    ["GPS", showGPS(getPair(files, (file) => [file.latitudeDecimal, file.longitudeDecimal]))],
    // picture
    ["Camera", getSingle(files, (file) => file.cameraModel)],
    ["Date created", showDate(getSingle(files, (file) => file.birthtimeMs))],
    ["Date modified", showDate(getSingle(files, (file) => file.mtimeMs))],
  ];

  const more = showMore(getSingle(files, (file) => file.more));
  properties = properties.concat(more);

  return (
    <>
      <h2>{title}</h2>
      <table>
        <tbody>
          <tr>
            <td colSpan={2}>{getSingle(files, (file) => file.contentType)}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <img src={first.thumbnailUrl} />
            </td>
          </tr>
          {properties
            .filter((pair) => pair[1])
            .map((pair) => (
              <tr>
                <td>{pair[0]}:</td>
                <td>{pair[1]}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
};
