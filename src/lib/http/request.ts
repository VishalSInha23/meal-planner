import { z } from "zod";
import { notFound } from "./errors.ts";

// Parses the JSON body with a zod schema. A missing or malformed body fails validation.
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  return schema.parse(await request.json().catch(() => undefined));
}

// A record id from the URL. Anything that is not a uuid can't exist, so it is not found.
export async function idParam(params: Promise<{ id: string }>): Promise<string> {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) throw notFound();
  return parsed.data;
}
