/** Tiny ANSI logger: every actor in the economy logs with its own color. */

const RESET = "\x1b[0m";
export const paint = {
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  yellow: (s: string) => `\x1b[33m${s}${RESET}`,
  blue: (s: string) => `\x1b[34m${s}${RESET}`,
  magenta: (s: string) => `\x1b[35m${s}${RESET}`,
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  gray: (s: string) => `\x1b[90m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

export type Color = keyof typeof paint;

export function makeLogger(tag: string, color: Color) {
  return (msg: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`${paint.gray(ts)} ${paint[color](tag.padEnd(14))} ${msg}`);
  };
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const jitter = (ms: number, spread = 0.4) => ms * (1 - spread / 2 + Math.random() * spread);
