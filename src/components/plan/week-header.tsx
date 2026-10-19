"use client";

import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import { useApiAction, rowMessage } from "@/components/household/use-api-action";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { IconLink } from "@/components/ui/icon-link";
import { apiRequest } from "@/lib/http/api-client";
import { addDaysTo, weekOffset } from "@/lib/time/week";
import type { WeekPlanned } from "@/modules/meal/meal-schema";
import { plannedLabel, weekRange, weekTag } from "./plan-format";
import { useReloadAfterChange } from "./use-week";

export interface WeekHeaderProps {
  weekStart: string;
  // The first day of the week that holds today.
  currentWeekStart: string;
  planned: WeekPlanned | null;
  // The last background reload failed.
  refreshFailed: boolean;
  reload: () => Promise<void>;
}

export function WeekHeader({ weekStart, currentWeekStart, planned, refreshFailed, reload }: WeekHeaderProps) {
  const marking = useApiAction();
  const { pending, reloadNow } = useReloadAfterChange(reload);
  const message = rowMessage(marking.failure);
  const path = `/api/weeks/${weekStart}/planned`;

  async function toggle() {
    const result = await marking.run(() => apiRequest(planned ? "DELETE" : "PUT", path));
    if (result.ok) await reloadNow();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconLink label="Previous week" href={`/plan/${addDaysTo(weekStart, -7)}`}>
          <ChevronLeft size={20} aria-hidden="true" />
        </IconLink>
        <div className="flex min-w-0 flex-1 flex-col text-center">
          <h1 className="text-2xl font-semibold">{weekRange(weekStart)}</h1>
          <p className="text-ink/75">{weekTag(weekOffset(weekStart, currentWeekStart))}</p>
        </div>
        <IconLink label="Next week" href={`/plan/${addDaysTo(weekStart, 7)}`}>
          <ChevronRight size={20} aria-hidden="true" />
        </IconLink>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {weekStart !== currentWeekStart && (
          <IconLink label="This week" href={`/plan/${currentWeekStart}`}>
            <CalendarDays size={20} aria-hidden="true" />
          </IconLink>
        )}
        {planned ? (
          <Button variant="primary" title="Undo week planned" loading={marking.busy} disabled={pending} onClick={() => void toggle()}>
            <CircleCheck size={20} aria-hidden="true" />
            {plannedLabel(planned)}
          </Button>
        ) : (
          <IconButton label="Week planned" loading={marking.busy} disabled={pending} onClick={() => void toggle()}>
            <CircleCheck size={20} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {message && <FieldError id="week-planned-error">{message}</FieldError>}
      {refreshFailed && <p className="text-ink/75">Couldn’t refresh, trying again</p>}
    </div>
  );
}
