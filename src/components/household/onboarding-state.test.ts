import { describe, expect, it } from "vitest";
import {
  addPerson,
  addSlot,
  buildPayload,
  errorsUnder,
  fieldsOfStep,
  firstStepWithErrors,
  initialState,
  removeSlot,
  sortSlots,
  stepOfField,
  validateOnboarding,
  type OnboardingState,
} from "./onboarding-state";

function filled(): OnboardingState {
  const state = initialState("Asha Rao");
  return {
    ...state,
    you: { ...state.you, sex: "female", dateOfBirth: "1988-04-23" },
    household: { ...state.household, name: "Rao home" },
  };
}

describe("initialState", () => {
  it("starts with the default slots, all ticked for you, Monday and 16:00", () => {
    const state = initialState("Asha Rao");
    expect(state.slots.map(({ name, time }) => [name, time])).toEqual([
      ["Breakfast", "08:00"],
      ["Lunch", "13:00"],
      ["Dinner", "20:00"],
    ]);
    expect(state.you.slotIds).toEqual(state.slots.map((slot) => slot.key));
    expect(state.you.name).toBe("Asha Rao");
    expect(state.household).toEqual({ name: "", weekStartDay: 1 });
    expect(state.trips).toEqual([]);
    expect(state.members).toEqual([]);
  });
});

describe("buildPayload", () => {
  it("names each person's slots by position in the slot list", () => {
    let state = filled();
    state = addPerson(state);
    const [breakfast, lunch, dinner] = state.slots;
    state = {
      ...state,
      you: { ...state.you, slotIds: [dinner!.key, breakfast!.key] },
      members: [{ ...state.members[0]!, name: "Kabir", sex: "male", ageBand: "6-10", slotIds: [lunch!.key] }],
      trips: [{ key: "t", dayOfWeek: 6, time: "10:00" }],
    };
    expect(buildPayload(state)).toEqual({
      you: { name: "Asha Rao", sex: "female", dateOfBirth: "1988-04-23", slotPositions: [0, 2] },
      household: { name: "Rao home", weekStartDay: 1 },
      mealSlots: [
        { name: "Breakfast", time: "08:00" },
        { name: "Lunch", time: "13:00" },
        { name: "Dinner", time: "20:00" },
      ],
      shoppingTrips: [{ dayOfWeek: 6, time: "10:00" }],
      members: [{ name: "Kabir", sex: "male", ageBand: "6-10", slotPositions: [1] }],
    });
  });

  it("keeps positions right after a slot is removed from the middle", () => {
    const state = filled();
    const lunch = state.slots[1]!;
    const next = removeSlot(state, lunch.key);
    expect(buildPayload(next)).toMatchObject({
      mealSlots: [
        { name: "Breakfast", time: "08:00" },
        { name: "Dinner", time: "20:00" },
      ],
      you: { slotPositions: [0, 1] },
    });
  });
});

describe("addSlot and removeSlot", () => {
  it("ticks a new slot for everyone and unticks a removed one", () => {
    let state = addPerson(filled());
    state = addSlot(state);
    const added = state.slots[3]!;
    expect(state.you.slotIds).toContain(added.key);
    expect(state.members[0]!.slotIds).toContain(added.key);
    state = removeSlot(state, added.key);
    expect(state.slots).toHaveLength(3);
    expect(state.you.slotIds).not.toContain(added.key);
    expect(state.members[0]!.slotIds).not.toContain(added.key);
  });
});

describe("sortSlots", () => {
  it("puts a new slot in time order and keeps every tick on its slot", () => {
    let state = addPerson(filled());
    const [breakfast, lunch, dinner] = state.slots;
    state = {
      ...state,
      you: { ...state.you, slotIds: [dinner!.key, breakfast!.key] },
      members: [{ ...state.members[0]!, name: "Kabir", sex: "male", ageBand: "6-10", slotIds: [lunch!.key, dinner!.key] }],
    };
    state = addSlot(state);
    const tea = state.slots[3]!;
    state = { ...state, slots: state.slots.map((slot) => (slot.key === tea.key ? { ...slot, name: "Tea time", time: "16:00" } : slot)) };
    state = { ...state, you: { ...state.you, slotIds: state.you.slotIds.filter((id) => id !== tea.key) } };

    const sorted = sortSlots(state);
    expect(sorted.slots.map((slot) => slot.name)).toEqual(["Breakfast", "Lunch", "Tea time", "Dinner"]);
    expect(sorted.you.slotIds).toEqual([dinner!.key, breakfast!.key]);
    const payload = buildPayload(state) as { you: { slotPositions: number[] }; members: { slotPositions: number[] }[] };
    expect(payload.you.slotPositions).toEqual([0, 3]);
    expect(payload.members[0]!.slotPositions).toEqual([1, 2, 3]);
  });

  it("leaves a slot without a time last", () => {
    const state = addSlot(filled());
    expect(sortSlots(state).slots.at(-1)!.time).toBe("");
  });
});

describe("validateOnboarding", () => {
  it("accepts a household with no other members and trims names", () => {
    const state = filled();
    const result = validateOnboarding({ ...state, household: { ...state.household, name: "  Rao home " } });
    expect(result).toMatchObject({ ok: true, payload: { household: { name: "Rao home" }, members: [] } });
  });

  it("names the fields that are wrong, with the API's dotted paths", () => {
    let state = addPerson(initialState(""));
    state = { ...state, slots: [...state.slots.slice(0, 2), { ...state.slots[2]!, time: "13:00" }] };
    const result = validateOnboarding(state);
    expect(result).toEqual({
      ok: false,
      fields: {
        "you.name": "Give the member a name",
        "you.sex": "Pick male or female",
        "you.dateOfBirth": "Use a date like 1990-04-23",
        "household.name": "Give the household a name",
        "mealSlots.2.time": "Another slot has this time",
        "members.0.name": "Give the member a name",
        "members.0.sex": "Pick male or female",
        "members.0.ageBand": "Pick an age band",
      },
    });
  });

  it("flags a person with no slot ticked", () => {
    const state = filled();
    const result = validateOnboarding({ ...state, you: { ...state.you, slotIds: [] } });
    expect(result).toEqual({ ok: false, fields: { "you.slotPositions": "Pick at least one meal slot" } });
  });

  it("flags an empty slot list and a duplicate trip", () => {
    const state = filled();
    const trip = { key: "a", dayOfWeek: 6, time: "10:00" };
    const result = validateOnboarding({ ...state, slots: [], trips: [trip, { ...trip, key: "b" }] });
    expect(result).toMatchObject({
      ok: false,
      fields: { mealSlots: "Add at least one meal slot", "shoppingTrips.1.time": "Another trip is at this day and time" },
    });
  });
});

describe("steps", () => {
  it("places each field on the step that shows it", () => {
    expect(stepOfField("you.name")).toBe(1);
    expect(stepOfField("you.dateOfBirth")).toBe(1);
    expect(stepOfField("you.slotPositions")).toBe(2);
    expect(stepOfField("household.weekStartDay")).toBe(2);
    expect(stepOfField("mealSlots")).toBe(2);
    expect(stepOfField("shoppingTrips.0.time")).toBe(2);
    expect(stepOfField("members.0.name")).toBe(3);
  });

  it("filters errors by step and finds the earliest step with errors", () => {
    const fields = { "members.0.name": "a", "household.name": "b" };
    expect(fieldsOfStep(fields, 2)).toEqual({ "household.name": "b" });
    expect(fieldsOfStep(fields, 1)).toEqual({});
    expect(firstStepWithErrors(fields)).toBe(2);
    expect(firstStepWithErrors({})).toBeNull();
  });
});

describe("errorsUnder", () => {
  it("strips the prefix and renames slot positions to slot ids", () => {
    const fields = { "members.1.name": "x", "members.1.slotPositions": "y", "members.2.name": "z", "you.name": "w" };
    expect(errorsUnder(fields, "members.1.")).toEqual({ name: "x", slotIds: "y" });
    expect(errorsUnder(fields, "you.")).toEqual({ name: "w" });
  });
});
