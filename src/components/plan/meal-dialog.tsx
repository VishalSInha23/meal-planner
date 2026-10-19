"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldError, controlBorder } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest, type ApiResult } from "@/lib/http/api-client";
import type { Meal } from "@/modules/meal/meal-schema";
import type { MealSlot } from "@/modules/meal-slot/meal-slot-schema";
import { changeFailure, longDay } from "./plan-format";
import { useDishSearch } from "./use-dish-search";
import { useWeekRefresh } from "./use-week-refresh";

export interface MealMember {
  id: string;
  name: string;
}

export interface MealDialogProps {
  date: string;
  slot: MealSlot;
  // The meal as last loaded, or undefined while nothing is planned.
  meal: Meal | undefined;
  members: MealMember[];
  onClose: () => void;
}

const ADD_KEY = "add";

function withoutKey(record: Readonly<Record<string, string>>, key: string): Record<string, string> {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}

export function MealDialog({ date, slot, meal, members, onClose }: MealDialogProps) {
  const searchId = useId();
  const [text, setText] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const search = useDishSearch(text, version);
  const { pending, refresh } = useWeekRefresh();
  const typed = text.trim();
  const exact = search.dishes.some((dish) => dish.name.toLowerCase() === typed.toLowerCase());
  const dishes = meal?.dishes ?? [];
  const locked = pending;

  // Runs one change. The control behind the key shows a spinner meanwhile, and the failure is shown under the key's row.
  async function change(key: string, errorKey: string, target: "add" | "dish", request: () => Promise<ApiResult<unknown>>): Promise<boolean> {
    setBusy((previous) => new Set(previous).add(key));
    setErrors((previous) => withoutKey(previous, errorKey));
    const result = await request();
    setBusy((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
    if (result.ok) {
      refresh();
      return true;
    }
    const failure = changeFailure(result, target);
    setErrors((previous) => ({ ...previous, [errorKey]: failure.message }));
    if (failure.refresh) refresh();
    return false;
  }

  async function add(body: { dishId: string } | { dishName: string }) {
    const added = await change(ADD_KEY, ADD_KEY, "add", () => apiRequest("POST", "/api/meal-dishes", { date, mealSlotId: slot.id, ...body }));
    if (added) {
      setText("");
      setVersion((value) => value + 1);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={`${longDay(date)} · ${slot.name}`}>
        <div className="flex flex-col gap-2">
          <label htmlFor={searchId} className="font-medium">
            Add a dish
          </label>
          <div className="relative">
            <Search size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
            <input
              id={searchId}
              type="search"
              autoComplete="off"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setErrors((previous) => withoutKey(previous, ADD_KEY));
              }}
              disabled={busy.has(ADD_KEY)}
              aria-describedby={errors[ADD_KEY] ? `${searchId}-error` : undefined}
              className={`min-h-11 w-full rounded-md bg-paper px-3 pr-10 pl-11 text-base text-ink disabled:opacity-60 ${controlBorder}`}
            />
            {(search.searching || busy.has(ADD_KEY)) && (
              <span role="status" aria-label={busy.has(ADD_KEY) ? "Adding" : "Searching"} className="absolute top-1/2 right-3 -translate-y-1/2">
                <Spinner />
              </span>
            )}
          </div>
          {errors[ADD_KEY] && <FieldError id={`${searchId}-error`}>{errors[ADD_KEY]}</FieldError>}
          {search.error && <FieldError id={`${searchId}-search-error`}>{search.error}</FieldError>}
          {search.settled && !search.error && (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
              {search.dishes.map((dish) => (
                <li key={dish.id}>
                  <button
                    type="button"
                    disabled={busy.has(ADD_KEY) || locked}
                    onClick={() => void add({ dishId: dish.id })}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left active:bg-ink/15 disabled:opacity-60 ${controlBorder}`}
                  >
                    <Plus size={20} aria-hidden="true" className="shrink-0" />
                    {dish.name}
                  </button>
                </li>
              ))}
              {!exact && (
                <li>
                  <button
                    type="button"
                    disabled={busy.has(ADD_KEY) || locked}
                    onClick={() => void add({ dishName: typed })}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left active:bg-ink/15 disabled:opacity-60 ${controlBorder}`}
                  >
                    <Plus size={20} aria-hidden="true" className="shrink-0" />
                    Create ‘{typed}’
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {dishes.length === 0 ? (
          <p className="text-ink/75">Nothing planned</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {dishes.map((dish) => (
              <li key={dish.id}>
                <div role="group" aria-labelledby={`${dish.id}-name`} className="flex flex-col gap-1 rounded-md border-[1.5px] border-ink p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span id={`${dish.id}-name`} className="min-w-0 font-semibold">
                      {dish.name}
                    </span>
                    <IconButton
                      label={`Remove ${dish.name}`}
                      loading={busy.has(`${dish.id}:remove`)}
                      disabled={locked}
                      onClick={() => void change(`${dish.id}:remove`, dish.id, "dish", () => apiRequest("DELETE", `/api/meal-dishes/${dish.id}`))}
                    >
                      <Trash2 size={20} aria-hidden="true" />
                    </IconButton>
                  </div>
                  {members.map((member) => {
                    const key = `${dish.id}:${member.id}`;
                    return (
                      <Checkbox
                        key={member.id}
                        label={member.name}
                        checked={dish.memberIds.includes(member.id)}
                        loading={busy.has(key)}
                        disabled={locked}
                        onCheckedChange={(eats) =>
                          void change(key, dish.id, "dish", () => apiRequest("PUT", `/api/meal-dishes/${dish.id}/members/${member.id}`, { eats }))
                        }
                      />
                    );
                  })}
                  {errors[dish.id] && <FieldError id={`${dish.id}-error`}>{errors[dish.id]}</FieldError>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
