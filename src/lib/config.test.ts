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

const valid = { port: 3000, baseUrl: "http://localhost:3000", plannerRefreshSeconds: 15 };
const example = JSON.stringify(valid);

describe("readAppConfig", () => {
  it("falls back to the example file when app.json is missing", () => {
    const dir = configDir({ "app.example.json": example });
    const { config, file } = readAppConfig(dir);
    expect(config).toEqual(valid);
    expect(file).toBe(join(dir, "app.example.json"));
  });

  it("prefers app.json", () => {
    const dir = configDir({
      "app.example.json": example,
      "app.json": JSON.stringify({ ...valid, port: 4000, baseUrl: "https://ceres.example.com" }),
    });
    const { config, file } = readAppConfig(dir);
    expect(config.port).toBe(4000);
    expect(file).toBe(join(dir, "app.json"));
  });

  it.each([
    ["port 0", { ...valid, port: 0 }],
    ["port 65536", { ...valid, port: 65536 }],
    ["trailing slash", { ...valid, baseUrl: "http://localhost:3000/" }],
    ["non-http url", { ...valid, baseUrl: "ftp://localhost" }],
    ["missing baseUrl", { port: 3000, plannerRefreshSeconds: 15 }],
    ["missing plannerRefreshSeconds", { port: 3000, baseUrl: "http://localhost:3000" }],
    ["plannerRefreshSeconds 4", { ...valid, plannerRefreshSeconds: 4 }],
    ["plannerRefreshSeconds 301", { ...valid, plannerRefreshSeconds: 301 }],
    ["plannerRefreshSeconds 7.5", { ...valid, plannerRefreshSeconds: 7.5 }],
    ["plannerRefreshSeconds a string", { ...valid, plannerRefreshSeconds: "15" }],
  ])("rejects %s", (_name, value) => {
    const dir = configDir({ "app.json": JSON.stringify(value) });
    expect(() => readAppConfig(dir)).toThrow(/Invalid config/);
  });

  it.each([5, 300])("accepts plannerRefreshSeconds %i", (seconds) => {
    const dir = configDir({ "app.json": JSON.stringify({ ...valid, plannerRefreshSeconds: seconds }) });
    expect(readAppConfig(dir).config.plannerRefreshSeconds).toBe(seconds);
  });

  it("reports a file that is not JSON", () => {
    const dir = configDir({ "app.json": "{ nope" });
    expect(() => readAppConfig(dir)).toThrow(/Cannot read/);
  });
});
