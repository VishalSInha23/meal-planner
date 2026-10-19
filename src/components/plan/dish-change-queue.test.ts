import { describe, expect, it } from "vitest";
import { createDishChangeQueue } from "./dish-change-queue.ts";

interface Result {
  version: number | null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

const versionOf = (result: Result) => result.version;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createDishChangeQueue", () => {
  it("runs changes to one dish in order, each with the version the one before returned", async () => {
    const queue = createDishChangeQueue();
    const first = deferred<Result>();
    const second = deferred<Result>();
    const sent: number[] = [];

    const a = queue.run("dish", 1, (version) => (sent.push(version), first.promise), versionOf);
    const b = queue.run("dish", 1, (version) => (sent.push(version), second.promise), versionOf);
    const c = queue.run("dish", 1, async (version) => (sent.push(version), { version: version + 1 }), versionOf);
    await tick();
    expect(sent).toEqual([1]);

    first.resolve({ version: 2 });
    await a;
    await tick();
    expect(sent).toEqual([1, 2]);

    second.resolve({ version: 3 });
    await Promise.all([b, c]);
    expect(sent).toEqual([1, 2, 3]);
  });

  it("uses the version the person saw when it is newer than the last returned one", async () => {
    const queue = createDishChangeQueue();
    await queue.run("dish", 1, async () => ({ version: 2 }), versionOf);
    const sent: number[] = [];
    await queue.run("dish", 5, async (version) => (sent.push(version), { version: null }), versionOf);
    await queue.run("dish", 1, async (version) => (sent.push(version), { version: null }), versionOf);
    expect(sent).toEqual([5, 2]);
  });

  it("runs changes to two dishes at once", async () => {
    const queue = createDishChangeQueue();
    const first = deferred<Result>();
    const second = deferred<Result>();
    const started: string[] = [];

    const a = queue.run("one", 1, () => (started.push("one"), first.promise), versionOf);
    const b = queue.run("two", 1, () => (started.push("two"), second.promise), versionOf);
    await tick();
    expect(started).toEqual(["one", "two"]);

    second.resolve({ version: 2 });
    await b;
    first.resolve({ version: 2 });
    await a;
  });

  it("keeps going after a change that failed or threw", async () => {
    const queue = createDishChangeQueue();
    const failed = queue.run("dish", 1, async () => ({ version: null }), versionOf);
    const threw = queue.run<Result>("dish", 1, () => Promise.reject(new Error("boom")), versionOf);
    const sent: number[] = [];
    const last = queue.run("dish", 1, async (version) => (sent.push(version), { version: version + 1 }), versionOf);
    expect(await failed).toEqual({ version: null });
    await expect(threw).rejects.toThrow("boom");
    expect(await last).toEqual({ version: 2 });
    expect(sent).toEqual([1]);
  });
});
