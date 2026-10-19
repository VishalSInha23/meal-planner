import { ageForTargets, type TargetInput } from "@/lib/nutrition/target-calculator";
import { dateOfBirthProblem } from "@/modules/member/member-schema";
import type { Units } from "@/modules/user-preference/user-preference-schema";
import { heightToCm, weightToKg, type MemberDraft } from "./member-draft";

export type SuggestField = "sex" | "age" | "height" | "weight" | "activityLevel" | "goal";

export type SuggestInput =
  | { ok: true; input: TargetInput; ageFromBand: boolean }
  | { ok: false; missing: SuggestField[] };

// The calculator input from what the form holds now. Height and weight are read in `units`; `today` is "YYYY-MM-DD" local time. Anything empty or unusable is reported as missing; nothing is assumed.
export function suggestInputFromDraft(draft: MemberDraft, today: string, units: Units): SuggestInput {
  const missing: SuggestField[] = [];

  if (!draft.sex) missing.push("sex");

  let age: { ageYears: number; fromBand: boolean } | null = null;
  if (draft.dateOfBirth && !dateOfBirthProblem(draft.dateOfBirth, today)) {
    age = ageForTargets({ dateOfBirth: draft.dateOfBirth, ageBand: null }, today);
  } else if (draft.ageBand) {
    age = ageForTargets({ dateOfBirth: null, ageBand: draft.ageBand }, today);
  }
  if (!age) missing.push("age");

  const height = heightToCm(draft, units);
  if (height.error || !height.cm || height.cm <= 0) missing.push("height");
  const weight = weightToKg(draft, units);
  if (weight.error || !weight.kg || weight.kg <= 0) missing.push("weight");
  if (!draft.activityLevel) missing.push("activityLevel");
  if (!draft.goal) missing.push("goal");

  if (missing.length > 0 || !age || !draft.sex || !draft.activityLevel || !draft.goal || !height.cm || !weight.kg) {
    return { ok: false, missing };
  }
  return {
    ok: true,
    ageFromBand: age.fromBand,
    input: {
      sex: draft.sex,
      ageYears: age.ageYears,
      heightCm: height.cm,
      weightKg: weight.kg,
      activityLevel: draft.activityLevel,
      goal: draft.goal,
    },
  };
}
