// The name of the unique constraint a db error violated, or null when it is another error.
// Drizzle wraps the driver error as the cause of its own, so both levels are checked.
export function uniqueViolation(error: unknown): string | null {
  for (let current = error, depth = 0; current && typeof current === "object" && depth < 5; depth++) {
    const { code, constraint, cause } = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (code === "23505") return typeof constraint === "string" ? constraint : "";
    current = cause;
  }
  return null;
}
