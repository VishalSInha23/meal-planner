"use client";

import { ChevronRight, Plus, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { FieldError, controlBorder } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/http/api-client";
import type { Dish } from "@/modules/dish/dish-schema";
import { DishDialog } from "./dish-dialog";
import { dishSummary } from "./dish-draft";
import { useDebouncedValue } from "./use-debounced-value";

export interface DishesViewProps {
  // The unfiltered list of dishes, read on the server.
  initial: Dish[];
}

// null = closed, "new" = adding, otherwise the id being edited.
type Open = null | "new" | string;

interface Loaded {
  // The search this list answers.
  key: string;
  dishes: Dish[];
  error: string | null;
}

export function DishesView({ initial }: DishesViewProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<Open>(null);
  const debounced = useDebouncedValue(query.trim());
  const key = JSON.stringify([debounced, version]);
  const [loaded, setLoaded] = useState<Loaded>({ key: JSON.stringify(["", 0]), dishes: initial, error: null });

  useEffect(() => {
    if (loaded.key === key) return;
    let current = true;
    const params = new URLSearchParams({ query: debounced });
    void apiRequest<Dish[]>("GET", `/api/dishes?${params}`).then((result) => {
      if (!current) return;
      setLoaded((previous) =>
        result.ok ? { key, dishes: result.data, error: null } : { key, dishes: previous.dishes, error: result.message },
      );
    });
    return () => {
      current = false;
    };
    // loaded.key only tells whether the shown list is already the right one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounced]);

  const searching = loaded.key !== key || query.trim() !== debounced;
  const editing = open && open !== "new" ? (loaded.dishes.find((dish) => dish.id === open) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dishes</h1>
        <IconButton label="Add dish" variant="primary" onClick={() => setOpen("new")}>
          <Plus size={20} aria-hidden="true" />
        </IconButton>
      </div>
      <Card>
        <div className="flex flex-col gap-1">
            <label htmlFor={searchId} className="font-medium">
              Search dishes
            </label>
            <div className="relative">
              <Search size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`min-h-11 w-full rounded-md bg-paper px-3 pr-10 pl-11 text-base text-ink ${controlBorder}`}
              />
              {searching && (
                <span role="status" aria-label="Searching" className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Spinner />
                </span>
              )}
            </div>
          </div>
        {loaded.error && <FieldError id="dishes-error">{loaded.error}</FieldError>}
        {loaded.dishes.length === 0 ? (
          <p className="text-ink/75">{query.trim() ? "No dishes match." : "No dishes yet. Add one with the plus button."}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {loaded.dishes.map((dish) => (
              <li key={dish.id}>
                <button
                  type="button"
                  onClick={() => setOpen(dish.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-ink px-3 py-2 text-left active:bg-ink/15"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{dish.name}</span>
                    <span className="text-ink/75">{dishSummary(dish)}</span>
                    {dish.ingredients.length > 0 && <span className="truncate text-ink/75">{dish.ingredients.join(", ")}</span>}
                  </span>
                  <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {(open === "new" || editing) && (
        <DishDialog key={editing?.id ?? "new"} dish={editing} onClose={() => setOpen(null)} reload={() => setVersion((value) => value + 1)} />
      )}
    </div>
  );
}
