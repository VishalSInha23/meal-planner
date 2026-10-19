import { describe, expect, it } from "vitest";
import { jsonWithEtag } from "./etag";

const request = (ifNoneMatch?: string) => new Request("http://localhost/x", { headers: ifNoneMatch ? { "if-none-match": ifNoneMatch } : {} });

describe("jsonWithEtag", () => {
  it("gives the same strong etag for the same body and another for a changed one", async () => {
    const first = jsonWithEtag(request(), { a: 1 });
    expect(first.headers.get("etag")).toMatch(/^"[0-9a-f]{64}"$/);
    expect(jsonWithEtag(request(), { a: 1 }).headers.get("etag")).toBe(first.headers.get("etag"));
    expect(jsonWithEtag(request(), { a: 2 }).headers.get("etag")).not.toBe(first.headers.get("etag"));
    expect(await first.json()).toEqual({ a: 1 });
  });

  it("answers 304 with no body when If-None-Match matches, also in a list, weak or *", async () => {
    const etag = jsonWithEtag(request(), { a: 1 }).headers.get("etag")!;
    for (const header of [etag, `"other", ${etag}`, `W/${etag}`, "*"]) {
      const response = jsonWithEtag(request(header), { a: 1 });
      expect(response.status, header).toBe(304);
      expect(response.headers.get("etag")).toBe(etag);
      expect(await response.text()).toBe("");
    }
    expect(jsonWithEtag(request('"other"'), { a: 1 }).status).toBe(200);
  });
});
