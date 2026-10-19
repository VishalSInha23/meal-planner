"use client";

import { useEffect, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 300;

// The value, as it was delayMs ago once it has stopped changing.
export function useDebouncedValue<T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
