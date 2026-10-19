import type { Week } from "@/modules/meal/meal-schema";

export interface RefresherEnv {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  isVisible: () => boolean;
  // Calls the listener when the page becomes visible or the window gets focus. Returns the way to stop.
  onWake: (listener: () => void) => () => void;
}

export interface RefresherState {
  week: Week;
  // The last reload failed.
  failed: boolean;
}

export interface WeekRefresher {
  // For after a change of the user's own. Resolves when a reload that started after the change has finished.
  reload: () => Promise<void>;
  dispose: () => void;
}

export function browserRefresherEnv(): RefresherEnv {
  return {
    fetch: (url, init) => fetch(url, init),
    setInterval: (callback, ms) => window.setInterval(callback, ms),
    clearInterval: (handle) => window.clearInterval(handle as number),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    isVisible: () => document.visibilityState === "visible",
    onWake: (listener) => {
      const onVisibility = () => {
        if (document.visibilityState === "visible") listener();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", listener);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", listener);
      };
    },
  };
}

type Outcome = { kind: "week"; week: Week; etag: string | null } | { kind: "unchanged" } | { kind: "failed" };

// Keeps one week up to date: reloads on an interval while the page is visible, and when it comes back.
// Plain TypeScript so it runs in tests without React or a browser.
export function createWeekRefresher(
  initialWeek: Week,
  refreshSeconds: number,
  env: RefresherEnv,
  onState: (state: RefresherState) => void,
): WeekRefresher {
  let state: RefresherState = { week: initialWeek, failed: false };
  let etag: string | null = null;
  let inFlight = false;
  let queued = false;
  let disposed = false;
  // Counts the user's own changes that have finished.
  let changes = 0;
  let waiters: { change: number; resolve: () => void }[] = [];

  function update(next: RefresherState) {
    if (next.week === state.week && next.failed === state.failed) return;
    state = next;
    onState(state);
  }

  // A reload slower than the refresh interval is out of date anyway, so it is aborted and counts as failed.
  async function fetchWeek(): Promise<Outcome> {
    const controller = new AbortController();
    const timer = env.setTimeout(() => controller.abort(), refreshSeconds * 1000);
    try {
      const headers: Record<string, string> = etag ? { "if-none-match": etag } : {};
      const response = await env.fetch(`/api/weeks/${state.week.weekStart}`, { cache: "no-store", headers, signal: controller.signal });
      if (response.status === 304) return { kind: "unchanged" };
      if (!response.ok) return { kind: "failed" };
      return { kind: "week", week: (await response.json()) as Week, etag: response.headers.get("etag") };
    } catch {
      return { kind: "failed" };
    } finally {
      env.clearTimeout(timer);
    }
  }

  async function run() {
    inFlight = true;
    const startedAt = changes;
    const outcome = await fetchWeek();
    inFlight = false;
    if (disposed) return;
    if (startedAt !== changes) {
      // The response may not include a change that finished meanwhile.
      queued = true;
    } else {
      if (outcome.kind === "week") {
        etag = outcome.etag;
        update({ week: outcome.week, failed: false });
      } else {
        update({ week: state.week, failed: outcome.kind === "failed" });
      }
      const done = waiters.filter((waiter) => waiter.change <= startedAt);
      waiters = waiters.filter((waiter) => waiter.change > startedAt);
      for (const waiter of done) waiter.resolve();
    }
    if (queued) {
      queued = false;
      void run();
    }
  }

  function request() {
    if (disposed) return;
    if (inFlight) queued = true;
    else void run();
  }

  const handle = env.setInterval(() => {
    if (env.isVisible()) request();
  }, refreshSeconds * 1000);
  const stopWake = env.onWake(() => {
    if (env.isVisible()) request();
  });

  return {
    reload() {
      if (disposed) return Promise.resolve();
      changes += 1;
      const done = new Promise<void>((resolve) => waiters.push({ change: changes, resolve }));
      request();
      return done;
    },
    dispose() {
      disposed = true;
      env.clearInterval(handle);
      stopWake();
      for (const waiter of waiters.splice(0)) waiter.resolve();
    },
  };
}
