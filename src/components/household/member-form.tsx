"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { FieldError } from "@/components/ui/field-parts";
import { useId } from "react";
import { cmToFeetInches, kgToLb } from "@/lib/units";
import { HEIGHT_CM_RANGE, WEIGHT_KG_RANGE } from "@/modules/member/member-schema";
import { DEFAULT_UNITS, type Units } from "@/modules/user-preference/user-preference-schema";
import type { FieldErrors, MemberDraft } from "./member-draft";
import { ACTIVITY_OPTIONS, AGE_BAND_OPTIONS, GOAL_OPTIONS, NOT_SET, SEX_OPTIONS } from "./options";

export interface SlotChoice {
  id: string;
  name: string;
}

interface PartProps {
  draft: MemberDraft;
  onChange: (draft: MemberDraft) => void;
  errors?: FieldErrors;
  disabled?: boolean;
  // The signed-in user's units for height and weight.
  units?: Units;
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

function heightHint({ heightUnit }: Units): string {
  if (heightUnit === "cm") return `Optional, ${HEIGHT_CM_RANGE.min} to ${HEIGHT_CM_RANGE.max} cm.`;
  const low = cmToFeetInches(HEIGHT_CM_RANGE.min);
  const high = cmToFeetInches(HEIGHT_CM_RANGE.max);
  return `Optional, ${low.feet} ft ${low.inches} in to ${high.feet} ft ${high.inches} in.`;
}

// Date of birth, the daily targets, and the body details the diet calculator uses. These only the household settings offer.
export function MemberDetailsFields({ draft, onChange, errors = {}, disabled, units = DEFAULT_UNITS }: PartProps) {
  const heightErrorId = useId();
  const weightUnit = units.weightUnit;
  const [weightMin, weightMax] =
    weightUnit === "kg"
      ? [WEIGHT_KG_RANGE.min, WEIGHT_KG_RANGE.max]
      : [kgToLb(WEIGHT_KG_RANGE.min), kgToLb(WEIGHT_KG_RANGE.max)];
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
      {units.heightUnit === "cm" ? (
        <TextField
          label="Height (cm)"
          type="number"
          inputMode="decimal"
          step="0.1"
          hint={heightHint(units)}
          value={draft.height}
          onChange={(event) => onChange({ ...draft, height: event.target.value })}
          error={errors.heightCm}
          disabled={disabled}
        />
      ) : (
        <fieldset className="flex flex-col gap-1" aria-describedby={errors.heightCm ? heightErrorId : undefined}>
          <legend className="font-medium">Height</legend>
          <p className="text-ink/75">{heightHint(units)}</p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Feet"
              type="number"
              inputMode="numeric"
              value={draft.height}
              onChange={(event) => onChange({ ...draft, height: event.target.value })}
              disabled={disabled}
            />
            <TextField
              label="Inches"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={draft.heightInches}
              onChange={(event) => onChange({ ...draft, heightInches: event.target.value })}
              disabled={disabled}
            />
          </div>
          {errors.heightCm && <FieldError id={heightErrorId}>{errors.heightCm}</FieldError>}
        </fieldset>
      )}
      <TextField
        label={`Weight (${weightUnit})`}
        type="number"
        inputMode="decimal"
        step="0.1"
        hint={`Optional, ${weightMin} to ${weightMax} ${weightUnit}.`}
        value={draft.weight}
        onChange={(event) => onChange({ ...draft, weight: event.target.value })}
        error={errors.weightKg}
        disabled={disabled}
      />
      <Select
        label="Activity level"
        options={[NOT_SET, ...ACTIVITY_OPTIONS]}
        value={draft.activityLevel || NOT_SET.value}
        onValueChange={(value) =>
          onChange({ ...draft, activityLevel: value === NOT_SET.value ? "" : (value as MemberDraft["activityLevel"]) })
        }
        error={errors.activityLevel}
        disabled={disabled}
      />
      <RadioGroup
        legend="Goal"
        options={[NOT_SET, ...GOAL_OPTIONS]}
        value={draft.goal || NOT_SET.value}
        onValueChange={(value) => onChange({ ...draft, goal: value === NOT_SET.value ? "" : (value as MemberDraft["goal"]) })}
        error={errors.goal}
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
