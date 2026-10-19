"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/components/dish/use-debounced-value";
import { apiRequest } from "@/lib/http/api-client";
import type { Dish } from "@/modules/dish/dish-schema";

interface Loaded {
  key: string;
  dishes: Dish[];
  error: string | null;
}

// The household's dishes matching the typed text, searched after typing pauses. Nothing is searched for blank text.
// Changing version (after a dish was created) discards the answers already received.
export function useDishSearch(text: string, version: number) {
  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed);
  const key = JSON.stringify([debounced, version]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!debounced) return;
    let current = true;
    const params = new URLSearchParams({ query: debounced });
    void apiRequest<Dish[]>("GET", `/api/dishes?${params}`).then((result) => {
      if (!current) return;
      setLoaded(result.ok ? { key, dishes: result.data, error: null } : { key, dishes: [], error: result.message });
    });
    return () => {
      current = false;
    };
  }, [key, debounced]);

  const settled = trimmed !== "" && trimmed === debounced && loaded?.key === key;
  return {
    searching: trimmed !== "" && !settled,
    dishes: settled ? loaded.dishes : [],
    error: settled ? loaded.error : null,
    // Whether the answer shown is for the text as typed.
    settled,
  };
}
