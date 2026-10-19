import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("sends a JSON body and returns the parsed data", async () => {
    const fetchMock = stubFetch(Response.json({ id: "a" }, { status: 201 }));
    const result = await apiRequest<{ id: string }>("POST", "/api/things", { name: "x" });
    expect(result).toEqual({ ok: true, data: { id: "a" } });
    expect(fetchMock).toHaveBeenCalledWith("/api/things", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"name":"x"}',
    });
  });

  it("returns undefined data for an empty 204", async () => {
    stubFetch(new Response(null, { status: 204 }));
    expect(await apiRequest("DELETE", "/api/things/1")).toEqual({ ok: true, data: undefined });
  });

  it("reads the error shape with its fields", async () => {
    stubFetch(
      Response.json({ error: { code: "validation_failed", message: "Some fields are invalid", fields: { name: "Too long" } } }, { status: 400 }),
    );
    expect(await apiRequest("PATCH", "/api/things/1", {})).toEqual({
      ok: false,
      status: 400,
      code: "validation_failed",
      message: "Some fields are invalid",
      fields: { name: "Too long" },
    });
  });

  it("falls back to a generic message when the body is not the error shape", async () => {
    stubFetch(new Response("boom", { status: 502 }));
    expect(await apiRequest("GET", "/api/things")).toMatchObject({ ok: false, status: 502, code: "unknown", fields: {} });
  });

  it("reports a network failure instead of throwing", async () => {
    stubFetch(new TypeError("failed"));
    expect(await apiRequest("GET", "/api/things")).toMatchObject({ ok: false, status: 0, code: "network_error" });
  });
});
