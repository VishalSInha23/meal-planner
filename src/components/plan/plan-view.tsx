"use client";

import { useState } from "react";
import type { Week } from "@/modules/meal/meal-schema";
import { DayCard, type DayMember } from "./day-card";
import { MealDialog } from "./meal-dialog";
import { WeekHeader } from "./week-header";

export interface PlanViewProps {
  week: Week;
  members: DayMember[];
  // Today's date in the local time.
  today: string;
  currentWeekStart: string;
}

interface OpenMeal {
  date: string;
  slotId: string;
}

export function PlanView({ week, members, today, currentWeekStart }: PlanViewProps) {
  const [open, setOpen] = useState<OpenMeal | null>(null);
  const slot = open ? week.mealSlots.find((candidate) => candidate.id === open.slotId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <WeekHeader weekStart={week.weekStart} currentWeekStart={currentWeekStart} planned={week.planned} />
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
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
