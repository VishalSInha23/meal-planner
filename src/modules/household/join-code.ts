import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const JOIN_CODE_LENGTH = 8;
// Creating or regenerating a code retries with a new one this many times when the code is already taken.
export const JOIN_CODE_MAX_TRIES = 5;
export const JOIN_CODE_UNIQUE_CONSTRAINT = "household_join_code_unique";

export function newJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

// Codes are entered case-insensitively, with surrounding spaces ignored.
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isJoinCodeFormat(input: string): boolean {
  return /^[A-Z0-9]{8}$/.test(input);
}
