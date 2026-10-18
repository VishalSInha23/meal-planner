import { randomInt, randomUUID } from "node:crypto";
import { getEnv } from "../env.ts";

const VALID_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export type RequestIdFormat = "base36" | "uuid";

export function newRequestId(format: RequestIdFormat = getEnv().REQUEST_ID_FORMAT): string {
  if (format === "uuid") return randomUUID();
  let id = "";
  for (let i = 0; i < 8; i++) id += randomInt(36).toString(36);
  return id.toUpperCase();
}

export function isValidRequestId(value: string | null | undefined): value is string {
  return typeof value === "string" && VALID_REQUEST_ID.test(value);
}

// Reuses a valid incoming id, otherwise makes a new one.
export function resolveRequestId(incoming: string | null | undefined, format?: RequestIdFormat): string {
  return isValidRequestId(incoming) ? incoming : newRequestId(format);
}
