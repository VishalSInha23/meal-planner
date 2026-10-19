"use client";

import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MemberBasicsFields, MemberSlotFields } from "@/components/household/member-form";
import { DAY_OPTIONS } from "@/components/household/options";
import {
  addPerson,
  addSlot,
  errorsUnder,
  fieldsOfStep,
  firstStepWithErrors,
  initialState,
  newKey,
  removeSlot,
  sortSlots,
  validateOnboarding,
  type OnboardingState,
  type Step,
} from "@/components/household/onboarding-state";
import type { FieldErrors, MemberDraft } from "@/components/household/member-draft";
import { SlotRow } from "@/components/household/slot-row";
import { TimezoneField } from "@/components/household/timezone-field";
import { TripRow } from "@/components/household/trip-row";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { apiRequest } from "@/lib/http/api-client";

const STEP_TITLES: Record<Step, string> = { 1: "About you", 2: "Your household", 3: "Other members" };

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function OnboardingForm({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<OnboardingState>(() => initialState(userName, browserTimezone()));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Editing clears the errors shown; they come back if the next try is still wrong.
  function edit(change: (current: OnboardingState) => OnboardingState) {
    setState(change);
    setErrors({});
    setFormError(undefined);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // Enter in a time field submits without a blur, so put the slots in order here too.
    const sorted = sortSlots(state);
    setState(sorted);
    const result = validateOnboarding(sorted);
    if (step < 3) {
      const here = result.ok ? {} : fieldsOfStep(result.fields, step);
      setErrors(here);
      if (Object.keys(here).length === 0) setStep((step + 1) as Step);
      return;
    }
    if (!result.ok) {
      setErrors(result.fields);
      setStep(firstStepWithErrors(result.fields) ?? step);
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    const response = await apiRequest("POST", "/api/household", result.payload);
    if (response.ok) {
      router.replace("/plan");
      return;
    }
    setSubmitting(false);
    const target = firstStepWithErrors(response.fields);
    setErrors(response.fields);
    if (target) setStep(target);
    else setFormError(response.message);
  }

  const slotChoices = state.slots.map((slot) => ({ id: slot.key, name: slot.name }));
  const youErrors = errorsUnder(errors, "you.");

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-ink/75" aria-live="polite">
          Step {step} of 3
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-offset-4">
          {STEP_TITLES[step]}
        </h1>
      </div>

      {step === 1 && (
        <Card>
          <MemberBasicsFields self draft={state.you} onChange={(you) => edit((s) => ({ ...s, you: { ...s.you, ...you } }))} errors={youErrors} />
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Household">
            <TextField
              label="Household name"
              value={state.household.name}
              onChange={(event) => edit((s) => ({ ...s, household: { ...s.household, name: event.target.value } }))}
              error={errors["household.name"]}
              autoComplete="off"
            />
            <TimezoneField
              value={state.household.timezone}
              onValueChange={(timezone) => edit((s) => ({ ...s, household: { ...s.household, timezone } }))}
              error={errors["household.timezone"]}
            />
            <Select
              label="Week starts on"
              options={DAY_OPTIONS}
              value={String(state.household.weekStartDay)}
              onValueChange={(value) => edit((s) => ({ ...s, household: { ...s.household, weekStartDay: Number(value) } }))}
              error={errors["household.weekStartDay"]}
            />
            <TextField
              label="Planning reminder time"
              type="time"
              hint="The reminder is the day before the week starts."
              value={state.household.planningReminderTime}
              onChange={(event) => edit((s) => ({ ...s, household: { ...s.household, planningReminderTime: event.target.value } }))}
              error={errors["household.planningReminderTime"]}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <Card
              title="Meal slots"
              actions={
                <IconButton label="Add meal slot" onClick={() => edit(addSlot)}>
                  <Plus size={20} aria-hidden="true" />
                </IconButton>
              }
            >
              {state.slots.map((slot, index) => (
                <SlotRow
                  key={slot.key}
                  name={slot.name}
                  time={slot.time}
                  onNameChange={(name) => edit((s) => ({ ...s, slots: s.slots.map((item) => (item.key === slot.key ? { ...item, name } : item)) }))}
                  onTimeChange={(time) => edit((s) => ({ ...s, slots: s.slots.map((item) => (item.key === slot.key ? { ...item, time } : item)) }))}
                  onTimeCommit={() => setState(sortSlots)}
                  errors={{ name: errors[`mealSlots.${index}.name`], time: errors[`mealSlots.${index}.time`] }}
                  actions={
                    <IconButton label="Remove meal slot" disabled={state.slots.length === 1} onClick={() => edit((s) => removeSlot(s, slot.key))}>
                      <Trash2 size={20} aria-hidden="true" />
                    </IconButton>
                  }
                />
              ))}
              {errors.mealSlots && <FieldError id="meal-slots-error">{errors.mealSlots}</FieldError>}
            </Card>

            <Card
              title="Shopping trips"
              actions={
                <IconButton
                  label="Add shopping trip"
                  onClick={() => edit((s) => ({ ...s, trips: [...s.trips, { key: newKey(), dayOfWeek: 6, time: "10:00" }] }))}
                >
                  <Plus size={20} aria-hidden="true" />
                </IconButton>
              }
            >
              {state.trips.length === 0 && <p className="text-ink/75">No shopping trips. They are optional.</p>}
              {state.trips.map((trip, index) => (
                <TripRow
                  key={trip.key}
                  dayOfWeek={trip.dayOfWeek}
                  time={trip.time}
                  onDayChange={(dayOfWeek) => edit((s) => ({ ...s, trips: s.trips.map((item) => (item.key === trip.key ? { ...item, dayOfWeek } : item)) }))}
                  onTimeChange={(time) => edit((s) => ({ ...s, trips: s.trips.map((item) => (item.key === trip.key ? { ...item, time } : item)) }))}
                  errors={{ dayOfWeek: errors[`shoppingTrips.${index}.dayOfWeek`], time: errors[`shoppingTrips.${index}.time`] }}
                  actions={
                    <IconButton label="Remove shopping trip" onClick={() => edit((s) => ({ ...s, trips: s.trips.filter((item) => item.key !== trip.key) }))}>
                      <Trash2 size={20} aria-hidden="true" />
                    </IconButton>
                  }
                />
              ))}
            </Card>
          </div>

          <Card title="Your meals" className="md:col-span-2">
            <MemberSlotFields
              legend="Which slots do you eat in?"
              draft={state.you}
              onChange={(you) => edit((s) => ({ ...s, you: { ...s.you, ...you } }))}
              slots={slotChoices}
              errors={youErrors}
            />
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-ink/75">
              {state.members.length === 0
                ? "Nobody else yet. You can skip this and add people later in the household settings."
                : "Everyone else who eats with you."}
            </p>
            <IconButton label="Add member" onClick={() => edit(addPerson)}>
              <Plus size={20} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {state.members.map((person, index) => {
              const personErrors = errorsUnder(errors, `members.${index}.`);
              const change = (next: MemberDraft) =>
                edit((s) => ({ ...s, members: s.members.map((item) => (item.key === person.key ? { ...item, ...next } : item)) }));
              return (
                <Card
                  key={person.key}
                  title={person.name.trim() || `Member ${index + 1}`}
                  actions={
                    <IconButton
                      label={`Remove member ${index + 1}`}
                      onClick={() => edit((s) => ({ ...s, members: s.members.filter((item) => item.key !== person.key) }))}
                    >
                      <Trash2 size={20} aria-hidden="true" />
                    </IconButton>
                  }
                >
                  <MemberBasicsFields draft={person} onChange={change} errors={personErrors} />
                  <MemberSlotFields draft={person} onChange={change} slots={slotChoices} errors={personErrors} />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {step > 1 ? (
          <IconButton label="Back" disabled={submitting} onClick={() => setStep((step - 1) as Step)}>
            <ArrowLeft size={20} aria-hidden="true" />
          </IconButton>
        ) : (
          <span />
        )}
        <div className="flex flex-col items-end gap-2">
          {step < 3 ? (
            <IconButton label="Next" type="submit" variant="primary">
              <ArrowRight size={20} aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton label="Finish" type="submit" variant="primary" loading={submitting}>
              <Check size={20} aria-hidden="true" />
            </IconButton>
          )}
          {formError && <FieldError id="onboarding-error">{formError}</FieldError>}
        </div>
      </div>
    </form>
  );
}
