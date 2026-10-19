"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { apiRequest } from "@/lib/http/api-client";
import { fromZodError } from "@/lib/http/errors";
import { updateHouseholdSchema, type Household } from "@/modules/household/household-schema";
import type { FieldErrors } from "./member-draft";
import { DAY_NAMES, DAY_OPTIONS } from "./options";
import { TimezoneField } from "./timezone-field";
import { rowMessage, useApiAction } from "./use-api-action";

export interface SettingsHouseholdCardProps {
  household: Household;
  isAdmin: boolean;
  reload: () => Promise<void>;
}

export function SettingsHouseholdCard({ household, isAdmin, reload }: SettingsHouseholdCardProps) {
  if (!isAdmin) {
    return (
      <Card title="Household">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="font-medium">Name</dt>
          <dd>{household.name}</dd>
          <dt className="font-medium">Timezone</dt>
          <dd>{household.timezone.replaceAll("_", " ")}</dd>
          <dt className="font-medium">Week starts on</dt>
          <dd>{DAY_NAMES[household.weekStartDay]}</dd>
          <dt className="font-medium">Planning reminder</dt>
          <dd>{household.planningReminderTime}</dd>
        </dl>
        <p className="text-ink/75">Only admins can change the household.</p>
      </Card>
    );
  }
  return <HouseholdForm household={household} reload={reload} />;
}

function HouseholdForm({ household, reload }: { household: Household; reload: () => Promise<void> }) {
  const [name, setName] = useState(household.name);
  const [timezone, setTimezone] = useState(household.timezone);
  const [weekStartDay, setWeekStartDay] = useState(household.weekStartDay);
  const [reminder, setReminder] = useState(household.planningReminderTime);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const action = useApiAction();
  const apiErrors = action.failure?.fields ?? {};

  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setErrors({});
      setSaved(false);
      action.clear();
    };
  }

  async function save() {
    const parsed = updateHouseholdSchema.safeParse({ name, timezone, weekStartDay, planningReminderTime: reminder });
    if (!parsed.success) {
      setErrors(fromZodError(parsed.error).fields ?? {});
      return;
    }
    setErrors({});
    const result = await action.run(() => apiRequest("PATCH", "/api/household", parsed.data));
    if (result.ok) {
      await reload();
      setSaved(true);
    }
  }

  const error = (field: string) => errors[field] ?? apiErrors[field];
  return (
    <Card
      title="Household"
      actions={
        <IconButton label="Save household" variant="primary" loading={action.busy} onClick={save}>
          <Check size={20} aria-hidden="true" />
        </IconButton>
      }
    >
      <TextField label="Household name" value={name} onChange={(event) => edit(setName)(event.target.value)} error={error("name")} autoComplete="off" />
      <TimezoneField value={timezone} onValueChange={edit(setTimezone)} error={error("timezone")} />
      <Select
        label="Week starts on"
        options={DAY_OPTIONS}
        value={String(weekStartDay)}
        onValueChange={(value) => edit(setWeekStartDay)(Number(value))}
        error={error("weekStartDay")}
      />
      <TextField
        label="Planning reminder time"
        type="time"
        hint="The reminder is the day before the week starts."
        value={reminder}
        onChange={(event) => edit(setReminder)(event.target.value)}
        error={error("planningReminderTime")}
      />
      {rowMessage(action.failure) && <FieldError id="household-error">{rowMessage(action.failure)}</FieldError>}
      {saved && (
        <p role="status" className="font-medium">
          <span aria-hidden="true">✓ </span>Saved
        </p>
      )}
    </Card>
  );
}
