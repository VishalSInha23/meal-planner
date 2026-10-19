import { AppError } from "@/lib/http/errors";
import * as repository from "./join-attempt-repository.ts";
import { JOIN_ATTEMPT_LIMIT, JOIN_ATTEMPT_WINDOW_MS } from "./join-attempt-schema.ts";

// Throws 429 when the account made too many wrong codes in the last hour. The message says how many
// minutes remain until the oldest of them is an hour old.
export async function assertCanAttempt(userId: string, now: Date = new Date()): Promise<void> {
  const attempts = await repository.listSince(userId, new Date(now.getTime() - JOIN_ATTEMPT_WINDOW_MS));
  if (attempts.length < JOIN_ATTEMPT_LIMIT) return;
  const waitMs = attempts[0].getTime() + JOIN_ATTEMPT_WINDOW_MS - now.getTime();
  const minutes = Math.max(1, Math.ceil(waitMs / 60_000));
  throw new AppError(429, "too_many_attempts", `Too many attempts, try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
}

export function recordWrongCode(userId: string, now: Date = new Date()): Promise<void> {
  return repository.insert(userId, now);
}
