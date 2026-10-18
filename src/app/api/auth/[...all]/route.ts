import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/auth";
import { route } from "@/lib/http/route";

const handle = route<{ all: string[] }>((request) => {
  const handler = toNextJsHandler(getAuth());
  return handler[request.method as "GET" | "POST"](request);
});

export const GET = handle;
export const POST = handle;
