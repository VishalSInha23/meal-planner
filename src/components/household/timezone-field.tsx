"use client";

import { useId, useMemo, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { timezoneSchema } from "@/modules/household/household-schema";
import { timezoneNames } from "./options";

export interface TimezoneFieldProps {
  value: string;
  onValueChange: (timezone: string) => void;
  error?: string;
  disabled?: boolean;
}

// The message for a value that is not a known timezone, or undefined when it is fine.
export function timezoneProblem(value: string): string | undefined {
  return timezoneSchema.safeParse(value.trim()).error?.issues[0]?.message;
}

// One text field whose suggestions (a datalist of all timezones) narrow as the person types.
export function TimezoneField({ value, onValueChange, error, disabled }: TimezoneFieldProps) {
  const listId = useId();
  const names = useMemo(() => timezoneNames(), []);
  const [touched, setTouched] = useState(false);
  return (
    <>
      <TextField
        label="Timezone"
        list={listId}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={() => setTouched(true)}
        error={error ?? (touched ? timezoneProblem(value) : undefined)}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <datalist id={listId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}
