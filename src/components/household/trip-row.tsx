import { useId, type ReactNode } from "react";
import { FieldError } from "@/components/ui/field-parts";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { DAY_NAMES, DAY_OPTIONS } from "./options";

export interface TripRowProps {
  dayOfWeek: number;
  time: string;
  onDayChange: (dayOfWeek: number) => void;
  onTimeChange: (time: string) => void;
  errors?: { dayOfWeek?: string; time?: string; row?: string };
  disabled?: boolean;
  // Icon buttons shown at the end of the row.
  actions?: ReactNode;
}

// A shopping trip's day and time, used by onboarding and by the household settings.
export function TripRow({ dayOfWeek, time, onDayChange, onTimeChange, errors = {}, disabled, actions }: TripRowProps) {
  const rowErrorId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <Select
            label="Trip day"
            options={DAY_OPTIONS}
            value={String(dayOfWeek)}
            onValueChange={(value) => onDayChange(Number(value))}
            error={errors.dayOfWeek}
            disabled={disabled}
          />
        </div>
        <TextField
          label="Trip time"
          type="time"
          value={time}
          onChange={(event) => onTimeChange(event.target.value)}
          error={errors.time}
          disabled={disabled}
        />
        {actions && <div className="mt-7 flex gap-2">{actions}</div>}
      </div>
      {errors.row && <FieldError id={rowErrorId}>{errors.row}</FieldError>}
    </div>
  );
}

export function tripLabel(dayOfWeek: number, time: string): string {
  return `${DAY_NAMES[dayOfWeek] ?? "Day"} ${time}`;
}
