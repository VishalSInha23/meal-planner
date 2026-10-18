import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { GET } from "./route.ts";

const call = () => GET(new NextRequest("http://localhost/api/health"), { params: Promise.resolve({}) });

describe("GET /api/health", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns ok when the db answers", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("returns 503 when the db fails", async () => {
    vi.spyOn(getDb(), "execute").mockRejectedValue(new Error("connection refused"));
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", db: "error" });
  });
});
