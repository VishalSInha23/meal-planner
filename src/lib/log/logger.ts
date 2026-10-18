import pino from "pino";
import { getEnv } from "../env.ts";
import { createPrettyStream } from "./log-pretty.ts";

type LogMethod = (obj: object, msg?: string) => void;

// The part of the logger that app code and test stubs have to provide.
export interface Log {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  child(bindings: object): Log;
  isLevelEnabled(level: string): boolean;
}

export type LogMode = "json" | "pretty" | "silent";

export function createLogger(level: string, mode: LogMode, stream?: { write(line: string): void }): Log {
  const options: pino.LoggerOptions = {
    level: mode === "silent" ? "silent" : level,
    formatters: { level: (label) => ({ level: label }) },
    serializers: { err: pino.stdSerializers.err },
  };
  // JSON keeps the pid (tells processes apart); hostname stays out. The pretty output hides both.
  options.base = mode === "json" ? { pid: process.pid } : undefined;
  if (stream) return pino(options, stream);
  if (mode === "pretty") return pino(options, createPrettyStream());
  return pino(options);
}

let appLogger: Log | undefined;

export function getLogger(): Log {
  if (!appLogger) {
    const env = getEnv();
    let mode: LogMode = process.env.NODE_ENV === "production" ? "json" : "pretty";
    if (process.env.VITEST || !env.LOG_ENABLED) mode = "silent";
    appLogger = createLogger(env.LOG_LEVEL, mode);
  }
  return appLogger;
}

export function roundMs(ms: number): number {
  return Math.round(ms * 1000) / 1000;
}

const MAX_ARRAY_ITEMS = 3;
const MAX_STRING_LENGTH = 200;

export function shorten(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map(shorten);
    if (value.length > MAX_ARRAY_ITEMS) items.push(`... ${value.length - MAX_ARRAY_ITEMS} more`);
    return items;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shorten(item)]));
  }
  return value;
}

const SENSITIVE_KEY = /password|secret|token|key/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "****" : redact(item)]),
    );
  }
  return value;
}
