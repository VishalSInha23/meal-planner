import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Week } from "@/modules/meal/meal-schema";
import { createWeekRefresher, type RefresherEnv, type RefresherState } from "./week-refresher";

const weekWith = (marker: string) => ({ weekStart: "2026-10-19", marker }) as unknown as Week;

interface Pending {
  init: RequestInit;
  respond: (response: Response | Error) => void;
}

function setup(seconds = 10) {
  let visible = true;
  let wake: () => void = () => {};
  const calls: Pending[] = [];
  const env: RefresherEnv = {
    fetch: (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        calls.push({ init, respond: (response) => (response instanceof Error ? reject(response) : resolve(response)) });
      }),
    setInterval: (callback, ms) => setInterval(callback, ms),
    clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
    setTimeout: (callback, ms) => setTimeout(callback, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    isVisible: () => visible,
    onWake: (listener) => {
      wake = listener;
      return () => {
        wake = () => {};
      };
    },
  };
  const states: RefresherState[] = [];
  const refresher = createWeekRefresher(weekWith("initial"), seconds, env, (state) => states.push(state));
  return {
    refresher,
    calls,
    states,
    setVisible: (value: boolean) => (visible = value),
    wake: () => wake(),
    last: () => states[states.length - 1],
  };
}

const ok = (marker: string, etag = `"${marker}"`) => Response.json(weekWith(marker), { headers: { etag } });
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createWeekRefresher", () => {
  it("reloads on the interval while visible and not while hidden", async () => {
    const t = setup(10);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(t.calls).toHaveLength(1);
    t.calls[0].respond(new Response(null, { status: 304 }));
    await flush();

    t.setVisible(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(t.calls).toHaveLength(1);

    t.setVisible(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(t.calls).toHaveLength(2);
  });

  it("reloads at once on becoming visible or on focus, but not while hidden", async () => {
    const t = setup();
    t.setVisible(false);
    t.wake();
    await flush();
    expect(t.calls).toHaveLength(0);

    t.setVisible(true);
    t.wake();
    await flush();
    expect(t.calls).toHaveLength(1);
  });

  it("asks without the browser cache, sends the last etag and keeps the week on 304", async () => {
    const t = setup();
    t.wake();
    await flush();
    expect(t.calls[0].init).toMatchObject({ cache: "no-store", headers: {} });
    t.calls[0].respond(ok("one", '"etag-one"'));
    await flush();
    expect(t.last().week).toEqual(weekWith("one"));

    t.wake();
    await flush();
    expect(t.calls[1].init).toMatchObject({ cache: "no-store", headers: { "if-none-match": '"etag-one"' } });
    t.calls[1].respond(new Response(null, { status: 304 }));
    await flush();
    expect(t.states).toHaveLength(1);
    expect(t.last()).toEqual({ week: weekWith("one"), failed: false });
  });

  it("never has two reloads in flight, and a due reload waits for the running one", async () => {
    const t = setup(10);
    await vi.advanceTimersByTimeAsync(10_000);
    t.wake();
    t.wake();
    await flush();
    expect(t.calls).toHaveLength(1);

    t.calls[0].respond(ok("one"));
    await flush();
    expect(t.calls).toHaveLength(2);
    expect(t.calls[1].init).toMatchObject({ headers: { "if-none-match": '"one"' } });
    t.calls[1].respond(new Response(null, { status: 304 }));
    await flush();
    expect(t.calls).toHaveLength(2);
  });

  it("drops a response that started before a finished change, and reloads again", async () => {
    const t = setup(10);
    await vi.advanceTimersByTimeAsync(10_000);
    let reloaded = false;
    const reload = t.refresher.reload().then(() => (reloaded = true));

    t.calls[0].respond(ok("old"));
    await flush();
    expect(t.states).toHaveLength(0);
    expect(reloaded).toBe(false);
    expect(t.calls).toHaveLength(2);

    t.calls[1].respond(ok("new"));
    await reload;
    expect(reloaded).toBe(true);
    expect(t.last().week).toEqual(weekWith("new"));
    expect(t.states).toHaveLength(1);
  });

  it("reload after a change fetches at once, even while hidden", async () => {
    const t = setup();
    t.setVisible(false);
    const reload = t.refresher.reload();
    await flush();
    expect(t.calls).toHaveLength(1);
    t.calls[0].respond(ok("mine"));
    await reload;
    expect(t.last().week).toEqual(weekWith("mine"));
  });

  it("keeps the week on a failure, sets the failed flag and clears it on the next success", async () => {
    const t = setup(10);
    await vi.advanceTimersByTimeAsync(10_000);
    t.calls[0].respond(new Error("offline"));
    await flush();
    expect(t.last()).toEqual({ week: weekWith("initial"), failed: true });

    await vi.advanceTimersByTimeAsync(10_000);
    t.calls[1].respond(Response.json({ error: {} }, { status: 500 }));
    await flush();
    expect(t.states).toHaveLength(1);
    expect(t.last().failed).toBe(true);

    await vi.advanceTimersByTimeAsync(10_000);
    t.calls[2].respond(ok("fresh"));
    await flush();
    expect(t.last()).toEqual({ week: weekWith("fresh"), failed: false });
  });

  it("clears the failed flag on a 304", async () => {
    const t = setup(10);
    await vi.advanceTimersByTimeAsync(10_000);
    t.calls[0].respond(new Error("offline"));
    await flush();
    await vi.advanceTimersByTimeAsync(10_000);
    t.calls[1].respond(new Response(null, { status: 304 }));
    await flush();
    expect(t.last()).toEqual({ week: weekWith("initial"), failed: false });
  });

  it("aborts a reload that outlasts the refresh interval, fails it, and lets the next one run", async () => {
    const t = setup(10);
    let reloaded = false;
    const reload = t.refresher.reload().then(() => (reloaded = true));
    await flush();
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0].init.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(t.calls[0].init.signal?.aborted).toBe(true);
    await reload;
    expect(reloaded).toBe(true);
    expect(t.last()).toEqual({ week: weekWith("initial"), failed: true });

    // The interval tick that came due meanwhile was queued behind the stalled reload and now runs.
    expect(t.calls).toHaveLength(2);
    t.calls[1].respond(ok("fresh"));
    await flush();
    expect(t.last()).toEqual({ week: weekWith("fresh"), failed: false });
  });

  it("clears the timer of a reload that finishes in time", async () => {
    const t = setup(10);
    t.wake();
    await flush();
    t.calls[0].respond(ok("one"));
    await flush();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(9_000);
    expect(t.calls[0].init.signal?.aborted).toBe(false);
    expect(t.last()).toEqual({ week: weekWith("one"), failed: false });
  });

  it("stops when disposed, and releases waiting reloads", async () => {
    const t = setup(10);
    const reload = t.refresher.reload();
    await flush();
    t.refresher.dispose();
    await reload;
    t.calls[0].respond(ok("late"));
    await vi.advanceTimersByTimeAsync(60_000);
    t.wake();
    await flush();
    expect(t.calls).toHaveLength(1);
    expect(t.states).toHaveLength(0);
  });
});
