import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MemberDayNutrition } from "@/modules/meal/meal-nutrition";
import type { Meal } from "@/modules/meal/meal-schema";
import type { MealSlot } from "@/modules/meal-slot/meal-slot-schema";
import { missingNote, nutritionSentence, shortDay, type NutritionTargets } from "./plan-format";

export interface DayMember extends NutritionTargets {
  id: string;
  name: string;
}

export interface DayCardProps {
  date: string;
  isToday: boolean;
  mealSlots: MealSlot[];
  meals: Meal[];
  members: DayMember[];
  nutrition: MemberDayNutrition[];
  onOpenSlot: (slotId: string) => void;
}

export function DayCard({ date, isToday, mealSlots, meals, members, nutrition, onOpenSlot }: DayCardProps) {
  const names = new Map(members.map((member) => [member.id, member.name]));
  return (
    <Card
      title={shortDay(date)}
      actions={isToday ? <span className="rounded-md border-[1.5px] border-ink px-2 font-semibold">Today</span> : undefined}
    >
      <ul className="flex flex-col gap-2">
        {mealSlots.map((slot) => {
          const dishes = meals.find((meal) => meal.mealSlotId === slot.id)?.dishes ?? [];
          return (
            <li key={slot.id}>
              <button
                type="button"
                onClick={() => onOpenSlot(slot.id)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-ink px-3 py-2 text-left active:bg-ink/15"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold">{slot.name}</span>
                  {dishes.length === 0 ? (
                    <span className="text-ink/75">Nothing planned</span>
                  ) : (
                    dishes.map((dish) => {
                      const eaters = dish.memberIds.map((id) => names.get(id)).filter(Boolean);
                      return (
                        <span key={dish.id} className="flex flex-col">
                          <span>{dish.name}</span>
                          <span className="text-ink/75">{eaters.length > 0 ? eaters.join(", ") : "nobody"}</span>
                        </span>
                      );
                    })
                  )}
                </span>
                <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="flex flex-col gap-2 border-t-[1.5px] border-ink/30 pt-3">
        {members.map((member) => {
          const day = nutrition.find((entry) => entry.date === date && entry.memberId === member.id);
          if (!day) return null;
          const note = missingNote(day);
          return (
            <li key={member.id}>
              <p>
                <span className="font-semibold">{member.name}</span> · {nutritionSentence(day, member)}
              </p>
              {note && <p className="text-ink/75">{note}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
