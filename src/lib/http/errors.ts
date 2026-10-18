import { z } from "zod";

export interface ErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message = "Invalid request", fields?: Record<string, string>) =>
  new AppError(400, "validation_failed", message, fields);
export const unauthorized = (message = "Not signed in") => new AppError(401, "unauthorized", message);
export const forbidden = (message = "Not allowed") => new AppError(403, "forbidden", message);
export const adminOnly = () => new AppError(403, "admin_only", "Only admins can do this");
export const noHousehold = () => new AppError(403, "no_household", "Finish setting up your household first");
export const notFound = (message = "Not found") => new AppError(404, "not_found", message);
export const conflict = (message = "Conflict", fields?: Record<string, string>) =>
  new AppError(409, "conflict", message, fields);

export function fromZodError(error: z.ZodError): AppError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.join(".");
    if (!(name in fields)) fields[name] = issue.message;
  }
  return badRequest("Some fields are invalid", fields);
}

// Maps any thrown value to the response status and body. Unexpected errors get a generic message.
export function toErrorResponse(error: unknown): { status: number; body: ErrorBody } {
  const appError = error instanceof z.ZodError ? fromZodError(error) : error;
  if (appError instanceof AppError) {
    const { code, message, fields } = appError;
    return { status: appError.status, body: { error: fields ? { code, message, fields } : { code, message } } };
  }
  return {
    status: 500,
    body: { error: { code: "internal_error", message: "Something went wrong" } },
  };
}
