import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readAppConfig } from "./config";

const dirs: string[] = [];

function configDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "ceres-config-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const example = JSON.stringify({ port: 3000, baseUrl: "http://localhost:3000" });

describe("readAppConfig", () => {
  it("falls back to the example file when app.json is missing", () => {
    const dir = configDir({ "app.example.json": example });
    const { config, file } = readAppConfig(dir);
    expect(config).toEqual({ port: 3000, baseUrl: "http://localhost:3000" });
    expect(file).toBe(join(dir, "app.example.json"));
  });

  it("prefers app.json", () => {
    const dir = configDir({
      "app.example.json": example,
      "app.json": JSON.stringify({ port: 4000, baseUrl: "https://ceres.example.com" }),
    });
    const { config, file } = readAppConfig(dir);
    expect(config.port).toBe(4000);
    expect(file).toBe(join(dir, "app.json"));
  });

  it.each([
    ["port 0", { port: 0, baseUrl: "http://localhost:3000" }],
    ["port 65536", { port: 65536, baseUrl: "http://localhost:3000" }],
    ["trailing slash", { port: 3000, baseUrl: "http://localhost:3000/" }],
    ["non-http url", { port: 3000, baseUrl: "ftp://localhost" }],
    ["missing baseUrl", { port: 3000 }],
  ])("rejects %s", (_name, value) => {
    const dir = configDir({ "app.json": JSON.stringify(value) });
    expect(() => readAppConfig(dir)).toThrow(/Invalid config/);
  });

  it("reports a file that is not JSON", () => {
    const dir = configDir({ "app.json": "{ nope" });
    expect(() => readAppConfig(dir)).toThrow(/Cannot read/);
  });
});
