import { app } from 'electron';
import fs from 'fs';
import path from 'path';

import { ConfigUI, getDefaultConfig } from '../shared-types';
import { log } from './log';

import type { Config } from "../shared-types";

const configDir = app.getPath("userData");
const configPath = path.join(configDir, "config.json");
const configUIPath = path.join(configDir, "configUI.json");
log(`configPath is ${configPath}`);

export function readConfig(): Config {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
  if (!fs.existsSync(configPath)) return getDefaultConfig();
  const text = fs.readFileSync(configPath, { encoding: "utf8" });
  const config: Config = JSON.parse(text);
  return config;
}

export function writeConfig(config: Config): void {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
  const text = JSON.stringify(config);
  fs.writeFileSync(configPath, text, { encoding: "utf8" });
}

export function readConfigUI(): ConfigUI {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
  if (!fs.existsSync(configUIPath)) return {};
  const text = fs.readFileSync(configUIPath, { encoding: "utf8" });
  const configUI: ConfigUI = JSON.parse(text);
  return configUI;
}

export function writeConfigUI(configUI: ConfigUI): void {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
  const text = JSON.stringify(configUI);
  fs.writeFileSync(configUIPath, text, { encoding: "utf8" });
}

export function readFileExtensions(): string[] {
  const images = ["jpg", "jpeg", "jpe", "jfif", "gif", "tif", "tiff", "bmp", "dib", "png", "ico", "heic", "webp"];
  const videos = ["mp4", "wmv", "flv", "avi", "mpg", "mpeg", "mkv", "ts"];
  return images.concat(videos);
}
