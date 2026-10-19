import { fromZodError } from "@/lib/http/errors";
import { onboardingSchema, type Onboarding } from "@/modules/household/household-schema";
import { sortedByTime } from "./slot-order";
import { emptyMemberDraft, type FieldErrors, type MemberDraft } from "./member-draft";

export type Step = 1 | 2 | 3;

// Rows have a client-only key: slots have no id until the household is saved, and members pick slots by key.
export interface SlotDraft {
  key: string;
  name: string;
  time: string;
}

export interface TripDraft {
  key: string;
  dayOfWeek: number;
  time: string;
}

export interface PersonDraft extends MemberDraft {
  key: string;
}

export interface OnboardingState {
  you: PersonDraft;
  household: { name: string; weekStartDay: number };
  slots: SlotDraft[];
  trips: TripDraft[];
  members: PersonDraft[];
}

let counter = 0;
export function newKey(): string {
  counter += 1;
  return `row-${counter}`;
}

const DEFAULT_SLOTS = [
  { name: "Breakfast", time: "08:00" },
  { name: "Lunch", time: "13:00" },
  { name: "Dinner", time: "20:00" },
];

export function initialState(userName: string): OnboardingState {
  const slots = DEFAULT_SLOTS.map((slot) => ({ ...slot, key: newKey() }));
  return {
    you: { ...emptyMemberDraft(slots.map((slot) => slot.key), userName), key: newKey() },
    household: { name: "", weekStartDay: 1 },
    slots,
    trips: [],
    members: [],
  };
}

// A new slot is ticked for everyone, as the default is "all slots".
export function addSlot(state: OnboardingState): OnboardingState {
  const slot: SlotDraft = { key: newKey(), name: "", time: "" };
  return {
    ...state,
    slots: [...state.slots, slot],
    you: { ...state.you, slotIds: [...state.you.slotIds, slot.key] },
    members: state.members.map((member) => ({ ...member, slotIds: [...member.slotIds, slot.key] })),
  };
}

// Slots in time order. People tick slots by key, so ticks stay on the right slots when the rows move.
export function sortSlots(state: OnboardingState): OnboardingState {
  return { ...state, slots: sortedByTime(state.slots, (slot) => slot.time) };
}

export function removeSlot(state: OnboardingState, key: string): OnboardingState {
  const without = (person: PersonDraft): PersonDraft => ({ ...person, slotIds: person.slotIds.filter((id) => id !== key) });
  return {
    ...state,
    slots: state.slots.filter((slot) => slot.key !== key),
    you: without(state.you),
    members: state.members.map(without),
  };
}

export function addPerson(state: OnboardingState): OnboardingState {
  const person: PersonDraft = { ...emptyMemberDraft(state.slots.map((slot) => slot.key)), key: newKey() };
  return { ...state, members: [...state.members, person] };
}

// The request body for POST /api/household. People name their slots by position in the slot list.
// Fields are passed as typed (an empty sex stays empty) so the schema reports what is missing.
export function buildPayload(input: OnboardingState): unknown {
  const state = sortSlots(input);
  const positions = (slotIds: string[]) =>
    slotIds
      .map((id) => state.slots.findIndex((slot) => slot.key === id))
      .filter((position) => position >= 0)
      .sort((a, b) => a - b);
  const person = ({ name, sex, ageBand, slotIds }: PersonDraft) => ({ name, sex, ageBand, slotPositions: positions(slotIds) });
  const you = ({ name, sex, dateOfBirth, slotIds }: PersonDraft) => ({ name, sex, dateOfBirth, slotPositions: positions(slotIds) });
  return {
    you: you(state.you),
    household: state.household,
    mealSlots: state.slots.map(({ name, time }) => ({ name, time })),
    shoppingTrips: state.trips.map(({ dayOfWeek, time }) => ({ dayOfWeek, time })),
    members: state.members.map(person),
  };
}

export type OnboardingValidation = { ok: true; payload: Onboarding } | { ok: false; fields: FieldErrors };

export function validateOnboarding(state: OnboardingState): OnboardingValidation {
  const result = onboardingSchema.safeParse(buildPayload(state));
  if (result.success) return { ok: true, payload: result.data };
  return { ok: false, fields: fromZodError(result.error).fields ?? {} };
}

// The step that shows a field, for both zod paths and the API's `fields` (they use the same dotted names).
export function stepOfField(name: string): Step {
  if (name === "members" || name.startsWith("members.")) return 3;
  if (name === "you.name" || name === "you.sex" || name === "you.dateOfBirth") return 1;
  return 2;
}

export function fieldsOfStep(fields: FieldErrors, step: Step): FieldErrors {
  return Object.fromEntries(Object.entries(fields).filter(([name]) => stepOfField(name) === step));
}

export function firstStepWithErrors(fields: FieldErrors): Step | null {
  const steps = Object.keys(fields).map(stepOfField);
  return steps.length === 0 ? null : (Math.min(...steps) as Step);
}

// The errors under a prefix such as "members.1.", with the prefix removed. The API names a person's
// slots `slotPositions`; the member form calls them `slotIds`.
export function errorsUnder(fields: FieldErrors, prefix: string): FieldErrors {
  const result: FieldErrors = {};
  for (const [name, message] of Object.entries(fields)) {
    if (!name.startsWith(prefix)) continue;
    const local = name.slice(prefix.length).replace(/^slotPositions(\..*)?$/, "slotIds");
    if (!(local in result)) result[local] = message;
  }
  return result;
}
