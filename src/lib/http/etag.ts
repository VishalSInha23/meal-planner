import { createHash } from "node:crypto";

function matches(header: string | null, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === "*") return true;
  return header.split(",").some((candidate) => candidate.trim().replace(/^W\//, "") === etag);
}

// A JSON response with a strong ETag (a hash of the body). Answers 304 with no body when If-None-Match matches.
export function jsonWithEtag(request: Request, data: unknown): Response {
  const body = JSON.stringify(data);
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  const headers = { etag, "cache-control": "private, no-cache" };
  if (matches(request.headers.get("if-none-match"), etag)) return new Response(null, { status: 304, headers });
  return new Response(body, { status: 200, headers: { ...headers, "content-type": "application/json" } });
}
