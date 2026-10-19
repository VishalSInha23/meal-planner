import { fromZodError } from "@/lib/http/errors";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/units";
import {
  AGE_REQUIRED_MESSAGE,
  HEIGHT_CM_RANGE,
  WEIGHT_KG_RANGE,
  createMemberSchema,
  dateOfBirthProblem,
  type ActivityLevel,
  type CreateMember,
  type Goal,
  type Member,
  type MemberWithSlots,
} from "@/modules/member/member-schema";
import { DEFAULT_UNITS, type Units } from "@/modules/user-preference/user-preference-schema";

// What a member form holds: text as typed. Numbers are parsed when the draft is turned into a payload.
// `height` is cm, or the feet when the height unit is ft_in (then `heightInches` holds the inches). `weight` is in the weight unit.
export interface MemberDraft {
  name: string;
  sex: "" | "male" | "female";
  ageBand: string;
  dateOfBirth: string;
  kcalTarget: string;
  proteinTargetG: string;
  height: string;
  heightInches: string;
  weight: string;
  activityLevel: "" | ActivityLevel;
  goal: "" | Goal;
  slotIds: string[];
}

export type FieldErrors = Record<string, string>;

export function emptyMemberDraft(slotIds: string[], name = ""): MemberDraft {
  return { name, sex: "", ageBand: "", dateOfBirth: "", kcalTarget: "", proteinTargetG: "", height: "", heightInches: "", weight: "", activityLevel: "", goal: "", slotIds };
}

type Stored = Pick<Member, "heightCm" | "weightKg">;

// The height as the form shows it in the given unit.
function heightTexts(heightCm: number | null, units: Units): Pick<MemberDraft, "height" | "heightInches"> {
  if (heightCm === null) return { height: "", heightInches: "" };
  if (units.heightUnit === "cm") return { height: String(heightCm), heightInches: "" };
  const { feet, inches } = cmToFeetInches(heightCm);
  return { height: String(feet), heightInches: String(inches) };
}

function weightText(weightKg: number | null, units: Units): string {
  if (weightKg === null) return "";
  return String(units.weightUnit === "kg" ? weightKg : kgToLb(weightKg));
}

export function draftFromMember(member: MemberWithSlots, units: Units = DEFAULT_UNITS): MemberDraft {
  return {
    name: member.name,
    sex: member.sex,
    ageBand: member.ageBand ?? "",
    dateOfBirth: member.dateOfBirth ?? "",
    kcalTarget: member.kcalTarget === null ? "" : String(member.kcalTarget),
    proteinTargetG: member.proteinTargetG === null ? "" : String(member.proteinTargetG),
    ...heightTexts(member.heightCm, units),
    weight: weightText(member.weightKg, units),
    activityLevel: member.activityLevel ?? "",
    goal: member.goal ?? "",
    slotIds: member.slotIds,
  };
}

// An empty text is no value (null); anything else must be a number.
function numberOrNull(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : Number(trimmed);
}

const NOT_A_NUMBER = "Use a number";

// The stored height in cm from what was typed. Imperial display rounds to whole inches, so an untouched height keeps its stored value instead of drifting on every save.
function heightToCm(draft: MemberDraft, units: Units, stored?: Stored): { cm: number | null; error?: string } {
  if (stored?.heightCm != null) {
    const shown = heightTexts(stored.heightCm, units);
    if (shown.height === draft.height.trim() && shown.heightInches === draft.heightInches.trim()) return { cm: stored.heightCm };
  }
  if (units.heightUnit === "cm") {
    const cm = numberOrNull(draft.height);
    return Number.isNaN(cm) ? { cm: null, error: NOT_A_NUMBER } : { cm };
  }
  const feet = numberOrNull(draft.height);
  const inches = numberOrNull(draft.heightInches);
  if (feet === null && inches === null) return { cm: null };
  if (Number.isNaN(feet) || Number.isNaN(inches) || (feet ?? 0) < 0 || (inches ?? 0) < 0) {
    return { cm: null, error: "Use numbers for feet and inches" };
  }
  return { cm: feetInchesToCm(feet ?? 0, inches ?? 0) };
}

function weightToKg(draft: MemberDraft, units: Units, stored?: Stored): { kg: number | null; error?: string } {
  if (stored?.weightKg != null && weightText(stored.weightKg, units) === draft.weight.trim()) return { kg: stored.weightKg };
  const weight = numberOrNull(draft.weight);
  if (Number.isNaN(weight)) return { kg: null, error: NOT_A_NUMBER };
  return { kg: weight === null || units.weightUnit === "kg" ? weight : lbToKg(weight) };
}

// The schema's metric range, worded in the unit the form uses.
function heightRangeMessage(): string {
  const low = cmToFeetInches(HEIGHT_CM_RANGE.min);
  const high = cmToFeetInches(HEIGHT_CM_RANGE.max);
  return `Use ${low.feet} ft ${low.inches} in to ${high.feet} ft ${high.inches} in`;
}

function weightRangeMessage(): string {
  return `Use ${kgToLb(WEIGHT_KG_RANGE.min)} to ${kgToLb(WEIGHT_KG_RANGE.max)} lb`;
}

export type MemberValidation = { ok: true; payload: CreateMember } | { ok: false; fields: FieldErrors };

// Checks a draft with the module's zod schema, so the rules live in one place. `today` ("YYYY-MM-DD", local time) enables the date of birth range check the API also makes. Height and weight are read in `units` and the payload holds cm and kg; `stored` is the member's saved values.
export function validateMemberDraft(
  draft: MemberDraft,
  today?: string,
  units: Units = DEFAULT_UNITS,
  stored?: Stored,
): MemberValidation {
  const fields: FieldErrors = {};
  const kcalTarget = numberOrNull(draft.kcalTarget);
  const proteinTargetG = numberOrNull(draft.proteinTargetG);
  if (kcalTarget !== null && Number.isNaN(kcalTarget)) fields.kcalTarget = "Use a number";
  if (proteinTargetG !== null && Number.isNaN(proteinTargetG)) fields.proteinTargetG = "Use a number";
  const height = heightToCm(draft, units, stored);
  const weight = weightToKg(draft, units, stored);
  if (height.error) fields.heightCm = height.error;
  if (weight.error) fields.weightKg = weight.error;

  const result = createMemberSchema.safeParse({
    name: draft.name,
    sex: draft.sex,
    ageBand: draft.ageBand || null,
    dateOfBirth: draft.dateOfBirth || null,
    kcalTarget: Number.isNaN(kcalTarget) ? null : kcalTarget,
    proteinTargetG: Number.isNaN(proteinTargetG) ? null : proteinTargetG,
    heightCm: height.cm,
    weightKg: weight.kg,
    activityLevel: draft.activityLevel || null,
    goal: draft.goal || null,
    slotIds: draft.slotIds,
  });
  if (!result.success) {
    for (const [name, message] of Object.entries(fromZodError(result.error).fields ?? {})) {
      if (name in fields) continue;
      if (name === "heightCm" && units.heightUnit === "ft_in") fields[name] = heightRangeMessage();
      else if (name === "weightKg" && units.weightUnit === "lb") fields[name] = weightRangeMessage();
      else fields[name] = message;
    }
  }
  if (draft.dateOfBirth && today && !fields.dateOfBirth) {
    const problem = dateOfBirthProblem(draft.dateOfBirth, today);
    if (problem) fields.dateOfBirth = problem;
  }
  if (!draft.ageBand && !draft.dateOfBirth) fields.ageBand = AGE_REQUIRED_MESSAGE;
  if (Object.keys(fields).length > 0 || !result.success) return { ok: false, fields };
  return { ok: true, payload: result.data };
}
