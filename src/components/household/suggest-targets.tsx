"use client";

import { Calculator, Check, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { suggestTargets, type TargetStep } from "@/lib/nutrition/target-calculator";
import { localToday } from "@/lib/time/week";
import type { Units } from "@/modules/user-preference/user-preference-schema";
import type { MemberDraft } from "./member-draft";
import { ACTIVITY_OPTIONS, AGE_BAND_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS } from "./options";
import { applySuggestion, suggestInputFromDraft, type SuggestField } from "./suggest-input";

const ESTIMATE_NOTE = "An estimate, not medical advice. Not for pregnancy, breastfeeding or medical conditions.";
const UNDER_3_MESSAGE = "Targets can't be suggested for children under 3; set them yourself or ask a paediatrician.";
const BAND_NOTE = "Add a date of birth for a more accurate estimate.";
const ADULT_AGE = 18;

function formatStep(step: TargetStep): string {
  if (step.value === null) return step.label;
  const rounded = Math.abs(step.value) >= 100 ? Math.round(step.value) : Math.round(step.value * 100) / 100;
  return `${step.label}: ${rounded.toLocaleString("en-US")}${step.unit ? ` ${step.unit}` : ""}`;
}

export interface SuggestTargetsProps {
  draft: MemberDraft;
  onApply: (draft: MemberDraft) => void;
  units: Units;
  disabled?: boolean;
}

export function SuggestTargets({ draft, onApply, units, disabled }: SuggestTargetsProps) {
  // The fields that were missing when the panel opened, asked for in the panel; their values stay in `typed` until applied, and Apply copies all of `typed`.
  const [asked, setAsked] = useState<SuggestField[] | null>(null);
  const [typed, setTyped] = useState<Partial<MemberDraft>>({});

  function open() {
    const first = suggestInputFromDraft(draft, localToday(new Date()), units);
    setAsked(first.ok ? [] : first.missing);
    setTyped({});
  }

  if (asked === null) {
    return (
      <div>
        <IconButton label="Suggest targets" disabled={disabled} onClick={open}>
          <Calculator size={20} aria-hidden="true" />
        </IconButton>
      </div>
    );
  }

  const merged: MemberDraft = { ...draft, ...typed };
  const set = (patch: Partial<MemberDraft>) => setTyped({ ...typed, ...patch });
  const suggestInput = suggestInputFromDraft(merged, localToday(new Date()), units);
  // Fields left empty keep asking, so a field never disappears while it is still missing.
  const shownFields = suggestInput.ok ? asked : [...new Set([...asked, ...suggestInput.missing])];
  const suggestion = suggestInput.ok ? suggestTargets(suggestInput.input) : null;

  function apply() {
    if (!suggestion?.ok) return;
    onApply(applySuggestion(draft, typed, suggestion));
    setAsked(null);
  }

  function keepFormUnsubmitted(event: KeyboardEvent) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
  }

  return (
    <Card
      title="Suggested targets"
      actions={
        <IconButton label="Close suggestion" onClick={() => setAsked(null)}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-4" onKeyDown={keepFormUnsubmitted}>
        {shownFields.length > 0 && <p>Fill in what is missing to see a suggestion.</p>}
        {shownFields.includes("sex") && (
          <RadioGroup
            legend="Sex"
            options={SEX_OPTIONS}
            value={merged.sex}
            onValueChange={(value) => set({ sex: value as MemberDraft["sex"] })}
          />
        )}
        {shownFields.includes("age") && (
          <Select
            label="Age band"
            options={AGE_BAND_OPTIONS}
            value={merged.ageBand || undefined}
            onValueChange={(value) => set({ ageBand: value })}
            placeholder="Pick an age band"
          />
        )}
        {shownFields.includes("height") &&
          (units.heightUnit === "cm" ? (
            <TextField
              label="Height (cm)"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={merged.height}
              onChange={(event) => set({ height: event.target.value })}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Height (feet)"
                type="number"
                inputMode="numeric"
                value={merged.height}
                onChange={(event) => set({ height: event.target.value })}
              />
              <TextField
                label="Height (inches)"
                type="number"
                inputMode="decimal"
                step="0.5"
                value={merged.heightInches}
                onChange={(event) => set({ heightInches: event.target.value })}
              />
            </div>
          ))}
        {shownFields.includes("weight") && (
          <TextField
            label={`Weight (${units.weightUnit})`}
            type="number"
            inputMode="decimal"
            step="0.1"
            value={merged.weight}
            onChange={(event) => set({ weight: event.target.value })}
          />
        )}
        {shownFields.includes("activityLevel") && (
          <Select
            label="Activity level"
            options={ACTIVITY_OPTIONS}
            value={merged.activityLevel || undefined}
            onValueChange={(value) => set({ activityLevel: value as MemberDraft["activityLevel"] })}
            placeholder="Pick an activity level"
          />
        )}
        {shownFields.includes("goal") && (
          <RadioGroup
            legend="Goal"
            options={GOAL_OPTIONS}
            value={merged.goal}
            onValueChange={(value) => set({ goal: value as MemberDraft["goal"] })}
          />
        )}

        {suggestion && !suggestion.ok && <p>{UNDER_3_MESSAGE}</p>}
        {suggestion?.ok && suggestInput.ok && (
          <div className="flex flex-col gap-2">
            <p className="text-xl font-semibold">
              {suggestion.kcal.toLocaleString("en-US")} kcal · {suggestion.proteinG.toLocaleString("en-US")} g protein a day
            </p>
            <ul className="list-disc pl-5">
              {suggestion.steps.map((step) => (
                <li key={step.label}>{formatStep(step)}</li>
              ))}
            </ul>
            {suggestInput.ageFromBand && suggestInput.input.ageYears < ADULT_AGE && <p>{BAND_NOTE}</p>}
            <p className="text-ink/75">{ESTIMATE_NOTE}</p>
            <div>
              <IconButton label="Apply suggested targets" variant="primary" onClick={apply}>
                <Check size={20} aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
