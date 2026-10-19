"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { FieldError } from "@/components/ui/field-parts";
import { useId } from "react";
import type { FieldErrors, MemberDraft } from "./member-draft";
import { AGE_BAND_OPTIONS, SEX_OPTIONS } from "./options";

export interface SlotChoice {
  id: string;
  name: string;
}

interface PartProps {
  draft: MemberDraft;
  onChange: (draft: MemberDraft) => void;
  errors?: FieldErrors;
  disabled?: boolean;
}

// Name, sex and age band: the fields onboarding asks for. For your own entry (`self`) it asks the date of birth instead.
export function MemberBasicsFields({ draft, onChange, errors = {}, disabled, self }: PartProps & { self?: boolean }) {
  return (
    <>
      <TextField
        label="Name"
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
        error={errors.name}
        disabled={disabled}
        autoComplete="off"
      />
      <RadioGroup
        legend="Sex"
        options={SEX_OPTIONS}
        value={draft.sex}
        onValueChange={(value) => onChange({ ...draft, sex: value as MemberDraft["sex"] })}
        error={errors.sex}
        disabled={disabled}
      />
      {self ? (
        <TextField
          label="Date of birth"
          type="date"
          value={draft.dateOfBirth}
          onChange={(event) => onChange({ ...draft, dateOfBirth: event.target.value })}
          error={errors.dateOfBirth}
          disabled={disabled}
        />
      ) : (
        <Select
          label="Age band"
          options={AGE_BAND_OPTIONS}
          value={draft.ageBand || undefined}
          onValueChange={(value) => onChange({ ...draft, ageBand: value })}
          placeholder="Pick an age band"
          error={errors.ageBand}
          disabled={disabled}
        />
      )}
    </>
  );
}

// Date of birth and the daily targets, which only the household settings offer.
export function MemberDetailsFields({ draft, onChange, errors = {}, disabled }: PartProps) {
  return (
    <>
      <TextField
        label="Date of birth"
        type="date"
        hint="Optional. When set, it is used instead of the age band."
        value={draft.dateOfBirth}
        onChange={(event) => onChange({ ...draft, dateOfBirth: event.target.value })}
        error={errors.dateOfBirth}
        disabled={disabled}
      />
      <TextField
        label="Daily kcal target"
        type="number"
        inputMode="numeric"
        hint="Optional, 500 to 6000."
        value={draft.kcalTarget}
        onChange={(event) => onChange({ ...draft, kcalTarget: event.target.value })}
        error={errors.kcalTarget}
        disabled={disabled}
      />
      <TextField
        label="Daily protein target (g)"
        type="number"
        inputMode="decimal"
        step="0.1"
        hint="Optional, 10 to 300."
        value={draft.proteinTargetG}
        onChange={(event) => onChange({ ...draft, proteinTargetG: event.target.value })}
        error={errors.proteinTargetG}
        disabled={disabled}
      />
    </>
  );
}

export interface MemberSlotFieldsProps extends PartProps {
  slots: SlotChoice[];
  legend?: string;
}

// One checkbox per meal slot: the slots the member eats in.
export function MemberSlotFields({ draft, onChange, slots, legend = "Eats in", errors = {}, disabled }: MemberSlotFieldsProps) {
  const errorId = useId();
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={errors.slotIds ? errorId : undefined}>
      <legend className="font-medium">{legend}</legend>
      {slots.map((slot) => (
        <Checkbox
          key={slot.id}
          label={slot.name || "Unnamed slot"}
          checked={draft.slotIds.includes(slot.id)}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onChange({
              ...draft,
              slotIds: checked ? [...draft.slotIds, slot.id] : draft.slotIds.filter((id) => id !== slot.id),
            })
          }
        />
      ))}
      {errors.slotIds && <FieldError id={errorId}>{errors.slotIds}</FieldError>}
    </fieldset>
  );
}

export interface MemberFormProps extends PartProps {
  slots: SlotChoice[];
}

// The whole member form, as the household settings use it.
export function MemberForm({ slots, ...part }: MemberFormProps) {
  return (
    <>
      <MemberBasicsFields {...part} />
      <MemberDetailsFields {...part} />
      <MemberSlotFields {...part} slots={slots} />
    </>
  );
}
