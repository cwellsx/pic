import fs from 'fs';
import * as process from 'process';

console.log();

export function log(message: string): void {
  // this helps to show how long the various stages of application startup are
  const time = process.uptime();
  console.log(`${time.toFixed(3)} ${message}`);
}

export function showNumber(n: number): string {
  return n.toLocaleString("en");
}

// enable this and add logf statements to create a log of events with msec timestamps to measure performance
const enabled = false;
const writeStream = !enabled ? undefined : fs.createWriteStream("./pic.log", { flags: "a" });

export function logf(message: string): void {
  if (!writeStream) return;
  // this helps to show how long the various stages of application startup are
  const time = new Date(Date.now()).toISOString();
  writeStream.write(`${time}\t${message}\r\n`);
}
