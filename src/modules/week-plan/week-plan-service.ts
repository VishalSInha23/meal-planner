import { AppError, notFound } from "@/lib/http/errors";
import { isCalendarDate } from "@/lib/dates";
import { isWeekStart } from "@/lib/time/week";
import * as householdRepository from "../household/household-repository.ts";
import type { WeekPlanned } from "../meal/meal-schema.ts";
import * as repository from "./week-plan-repository.ts";

// 400 unless the date is a day on which the household's weeks start.
export function assertWeekStart(weekStart: string, weekStartDay: number): void {
  if (!isCalendarDate(weekStart) || !isWeekStart(weekStart, weekStartDay)) {
    throw new AppError(400, "invalid_week_start", "The date is not the first day of a week", {
      weekStart: "Use the first day of a week",
    });
  }
}

async function weekStartDayOf(householdId: string): Promise<number> {
  const household = await householdRepository.findById(householdId);
  if (!household) throw notFound("Household not found");
  return household.weekStartDay;
}

// Marking an already planned week changes nothing and returns the first mark.
export async function markWeekPlanned(householdId: string, memberId: string, weekStart: string): Promise<WeekPlanned> {
  assertWeekStart(weekStart, await weekStartDayOf(householdId));
  await repository.insert(householdId, weekStart, memberId);
  const planned = await repository.find(householdId, weekStart);
  if (!planned) throw notFound("Week not found");
  return planned;
}

export async function unmarkWeekPlanned(householdId: string, weekStart: string): Promise<void> {
  assertWeekStart(weekStart, await weekStartDayOf(householdId));
  await repository.remove(householdId, weekStart);
}
