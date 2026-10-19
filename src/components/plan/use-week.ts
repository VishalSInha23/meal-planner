"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Week } from "@/modules/meal/meal-schema";
import { browserRefresherEnv, createWeekRefresher, type WeekRefresher } from "./week-refresher";

// The week, kept up to date in the background. `reload` is for right after a change of the user's own.
export function useWeek(initialWeek: Week, refreshSeconds: number) {
  const [state, setState] = useState({ week: initialWeek, failed: false });
  const refresher = useRef<WeekRefresher | null>(null);

  useEffect(() => {
    const created = createWeekRefresher(initialWeek, refreshSeconds, browserRefresherEnv(), setState);
    refresher.current = created;
    return () => {
      created.dispose();
      refresher.current = null;
    };
  }, [initialWeek, refreshSeconds]);

  const reload = useCallback(() => refresher.current?.reload() ?? Promise.resolve(), []);
  return { week: state.week, failed: state.failed, reload };
}

// Runs `reload` and tells whether it is still running, so the controls can be disabled meanwhile.
export function useReloadAfterChange(reload: () => Promise<void>) {
  const [pending, setPending] = useState(false);
  const reloadNow = useCallback(async () => {
    setPending(true);
    await reload();
    setPending(false);
  }, [reload]);
  return { pending, reloadNow };
}
