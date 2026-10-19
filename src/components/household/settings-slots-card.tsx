"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { apiRequest } from "@/lib/http/api-client";
import { fromZodError } from "@/lib/http/errors";
import { createMealSlotSchema, type MealSlot } from "@/modules/meal-slot/meal-slot-schema";
import type { FieldErrors } from "./member-draft";
import { SlotRow } from "./slot-row";
import { rowMessage, useApiAction } from "./use-api-action";

export interface SettingsSlotsCardProps {
  slots: MealSlot[];
  isAdmin: boolean;
  reload: () => Promise<void>;
}

export function SettingsSlotsCard({ slots, isAdmin, reload }: SettingsSlotsCardProps) {
  if (!isAdmin) {
    return (
      <Card title="Meal slots">
        <ul className="flex flex-col gap-1">
          {slots.map((slot) => (
            <li key={slot.id} className="flex justify-between gap-4">
              <span>{slot.name}</span>
              <span>{slot.time}</span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  return (
    <Card title="Meal slots">
      {slots.map((slot) => (
        // The key includes the saved values, so a saved row starts again from what the server holds.
        <ExistingSlot key={`${slot.id}:${slot.name}:${slot.time}`} slot={slot} reload={reload} />
      ))}
      <NewSlot reload={reload} />
    </Card>
  );
}

function ExistingSlot({ slot, reload }: { slot: MealSlot; reload: () => Promise<void> }) {
  const [name, setName] = useState(slot.name);
  const [time, setTime] = useState(slot.time);
  const [errors, setErrors] = useState<FieldErrors>({});
  const saving = useApiAction();
  const removing = useApiAction();
  const dirty = name !== slot.name || time !== slot.time;
  const failure = saving.failure ?? removing.failure;

  function edit(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setErrors({});
      saving.clear();
      removing.clear();
    };
  }

  async function save() {
    const parsed = createMealSlotSchema.safeParse({ name, time });
    if (!parsed.success) {
      setErrors(fromZodError(parsed.error).fields ?? {});
      return;
    }
    const result = await saving.run(() => apiRequest("PATCH", `/api/meal-slots/${slot.id}`, parsed.data));
    if (result.ok) await reload();
  }

  async function remove() {
    const result = await removing.run(() => apiRequest("DELETE", `/api/meal-slots/${slot.id}`));
    if (result.ok) await reload();
  }

  return (
    <SlotRow
      name={name}
      time={time}
      onNameChange={edit(setName)}
      onTimeChange={edit(setTime)}
      disabled={saving.busy || removing.busy}
      errors={{
        name: errors.name ?? failure?.fields.name,
        time: errors.time ?? failure?.fields.time,
        row: rowMessage(failure),
      }}
      actions={
        <>
          {dirty && (
            <IconButton label={`Save ${slot.name}`} variant="primary" loading={saving.busy} disabled={removing.busy} onClick={save}>
              <Check size={20} aria-hidden="true" />
            </IconButton>
          )}
          <IconButton label={`Remove ${slot.name}`} loading={removing.busy} disabled={saving.busy} onClick={remove}>
            <Trash2 size={20} aria-hidden="true" />
          </IconButton>
        </>
      }
    />
  );
}

function NewSlot({ reload }: { reload: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const action = useApiAction();

  function edit(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setErrors({});
      action.clear();
    };
  }

  async function add() {
    const parsed = createMealSlotSchema.safeParse({ name, time });
    if (!parsed.success) {
      setErrors(fromZodError(parsed.error).fields ?? {});
      return;
    }
    const result = await action.run(() => apiRequest("POST", "/api/meal-slots", parsed.data));
    if (result.ok) {
      setName("");
      setTime("");
      await reload();
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t-[1.5px] border-ink pt-4">
      <p className="font-medium">New meal slot</p>
      <SlotRow
        name={name}
        time={time}
        onNameChange={edit(setName)}
        onTimeChange={edit(setTime)}
        disabled={action.busy}
        errors={{ name: errors.name ?? action.failure?.fields.name, time: errors.time ?? action.failure?.fields.time, row: rowMessage(action.failure) }}
        actions={
          <IconButton label="Add meal slot" variant="primary" loading={action.busy} onClick={add}>
            <Plus size={20} aria-hidden="true" />
          </IconButton>
        }
      />
    </div>
  );
}
