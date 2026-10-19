import { useId, type ReactNode } from "react";
import { FieldError } from "@/components/ui/field-parts";
import { TextField } from "@/components/ui/text-field";

export interface SlotRowProps {
  name: string;
  time: string;
  onNameChange: (name: string) => void;
  onTimeChange: (time: string) => void;
  errors?: { name?: string; time?: string; row?: string };
  disabled?: boolean;
  // Icon buttons shown at the end of the row.
  actions?: ReactNode;
}

// A meal slot's name and time, used by onboarding and by the household settings.
export function SlotRow({ name, time, onNameChange, onTimeChange, errors = {}, disabled, actions }: SlotRowProps) {
  const rowErrorId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <TextField
            label="Slot name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            error={errors.name}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <TextField
          label="Slot time"
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
