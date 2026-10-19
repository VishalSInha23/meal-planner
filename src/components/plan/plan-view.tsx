"use client";

import { useState } from "react";
import type { Week } from "@/modules/meal/meal-schema";
import { useWeek } from "./use-week";
import { DayCard, type DayMember } from "./day-card";
import { MealDialog } from "./meal-dialog";
import { WeekHeader } from "./week-header";

export interface PlanViewProps {
  // The week as the server rendered it. The view keeps it up to date.
  week: Week;
  refreshSeconds: number;
  // Today's date in the local time.
  today: string;
  currentWeekStart: string;
}

interface OpenMeal {
  date: string;
  slotId: string;
}

export function PlanView({ week: initialWeek, refreshSeconds, today, currentWeekStart }: PlanViewProps) {
  const { week, failed, reload } = useWeek(initialWeek, refreshSeconds);
  const members: DayMember[] = week.members;
  const [open, setOpen] = useState<OpenMeal | null>(null);
  const slot = open ? week.mealSlots.find((candidate) => candidate.id === open.slotId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <WeekHeader
        weekStart={week.weekStart}
        currentWeekStart={currentWeekStart}
        planned={week.planned}
        refreshFailed={failed}
        reload={reload}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {week.dates.map((date) => (
          <DayCard
            key={date}
            date={date}
            isToday={date === today}
            mealSlots={week.mealSlots}
            meals={week.meals.filter((meal) => meal.date === date)}
            members={members}
            nutrition={week.nutrition}
            onOpenSlot={(slotId) => setOpen({ date, slotId })}
          />
        ))}
      </div>
      {open && slot && (
        <MealDialog
          key={`${open.date}:${open.slotId}`}
          date={open.date}
          slot={slot}
          meal={week.meals.find((meal) => meal.date === open.date && meal.mealSlotId === open.slotId)}
          members={members}
          reload={reload}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
