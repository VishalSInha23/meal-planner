import { format } from "date-fns";
import { addDaysTo } from "@/lib/time/week";
import type { MemberDayNutrition, TargetResult } from "@/modules/meal/meal-nutrition";
import type { WeekPlanned } from "@/modules/meal/meal-schema";

// A "YYYY-MM-DD" string as a local date, for formatting only.
function localDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "Thu 29 Oct".
export function shortDay(date: string): string {
  return format(localDate(date), "EEE d MMM");
}

// "Thursday 29 Oct".
export function longDay(date: string): string {
  return format(localDate(date), "EEEE d MMM");
}

// "Mon 26 Oct – Sun 1 Nov".
export function weekRange(weekStart: string): string {
  return `${shortDay(weekStart)} – ${shortDay(addDaysTo(weekStart, 6))}`;
}

// The offset is 0 for the current week, 1 for the next, -1 for the last.
export function weekTag(offset: number): string {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  if (offset > 1) return `In ${offset} weeks`;
  return offset === -1 ? "1 week ago" : `${-offset} weeks ago`;
}

// "Planned · Sun 14:05 by Vishal", in local time.
export function plannedLabel(planned: WeekPlanned): string {
  const when = format(new Date(planned.at), "EEE HH:mm");
  return `Planned · ${when}${planned.byName ? ` by ${planned.byName}` : ""}`;
}

const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });

function against(total: number, target: number | null, status: TargetResult | null, unit: string): string {
  if (target === null || status === null) return `${number(total)} ${unit}`;
  const side = status.status === "on_target" ? "on target" : `${number(status.difference)} ${status.status === "under" ? "under ▼" : "over ▲"}`;
  return `${number(total)} / ${number(target)} ${unit} · ${side}`;
}

export interface NutritionTargets {
  kcalTarget: number | null;
  proteinTargetG: number | null;
}

// "1,850 / 2,000 kcal · 150 under ▼ · 120 / 150 g protein · 30 under ▼". Without a target, just the total.
export function nutritionSentence(day: MemberDayNutrition, targets: NutritionTargets): string {
  return [
    against(day.kcal, targets.kcalTarget, day.kcalStatus, "kcal"),
    against(day.proteinG, targets.proteinTargetG, day.proteinStatus, "g protein"),
  ].join(" · ");
}

function missing(count: number, what: string): string | null {
  return count === 0 ? null : `${count} ${count === 1 ? "dish has" : "dishes have"} no ${what}`;
}

// "2 dishes have no kcal", or null when every dish has its values.
export function missingNote(day: MemberDayNutrition): string | null {
  const parts = [missing(day.dishesWithoutKcal, "kcal"), missing(day.dishesWithoutProtein, "protein")].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export interface ChangeFailure {
  status: number;
  code: string;
  message: string;
}

// What to show for a failed change, whether the week should be refreshed because someone else changed it,
// and whether the person should choose between their change and the other one (`conflict`).
// "add" is adding a dish to the meal; "dish" is changing or removing a dish already in it.
export function changeFailure(failure: ChangeFailure, target: "add" | "dish"): { message: string; refresh: boolean; conflict: boolean } {
  if (target === "add" && failure.status === 409 && failure.code === "dish_already_in_meal") {
    return { message: "Already in this meal", refresh: true, conflict: false };
  }
  if (target === "dish" && failure.status === 409 && failure.code === "meal_dish_changed") {
    return { message: "Someone else changed this just now", refresh: true, conflict: true };
  }
  if (target === "dish" && failure.status === 404) {
    return { message: "This was just changed by someone else", refresh: true, conflict: false };
  }
  return { message: failure.message, refresh: false, conflict: false };
}

// What a copy says it did.
export function copiedLabel(addedDishes: number): string {
  if (addedDishes === 0) return "Nothing new to copy";
  return `Added ${addedDishes} ${addedDishes === 1 ? "dish" : "dishes"}`;
}
