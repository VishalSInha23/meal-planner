import { fromZodError } from "@/lib/http/errors";
import {
  AGE_REQUIRED_MESSAGE,
  createMemberSchema,
  dateOfBirthProblem,
  type CreateMember,
  type MemberWithSlots,
} from "@/modules/member/member-schema";

// What a member form holds: text as typed. Numbers are parsed when the draft is turned into a payload.
export interface MemberDraft {
  name: string;
  sex: "" | "male" | "female";
  ageBand: string;
  dateOfBirth: string;
  kcalTarget: string;
  proteinTargetG: string;
  slotIds: string[];
}

export type FieldErrors = Record<string, string>;

export function emptyMemberDraft(slotIds: string[], name = ""): MemberDraft {
  return { name, sex: "", ageBand: "", dateOfBirth: "", kcalTarget: "", proteinTargetG: "", slotIds };
}

export function draftFromMember(member: MemberWithSlots): MemberDraft {
  return {
    name: member.name,
    sex: member.sex,
    ageBand: member.ageBand ?? "",
    dateOfBirth: member.dateOfBirth ?? "",
    kcalTarget: member.kcalTarget === null ? "" : String(member.kcalTarget),
    proteinTargetG: member.proteinTargetG === null ? "" : String(member.proteinTargetG),
    slotIds: member.slotIds,
  };
}

// An empty text is no value (null); anything else must be a number.
function numberOrNull(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export type MemberValidation = { ok: true; payload: CreateMember } | { ok: false; fields: FieldErrors };

// Checks a draft with the module's zod schema, so the rules live in one place. `today` ("YYYY-MM-DD" in the
// household's timezone) enables the date of birth range check the API also makes.
export function validateMemberDraft(draft: MemberDraft, today?: string): MemberValidation {
  const fields: FieldErrors = {};
  const kcalTarget = numberOrNull(draft.kcalTarget);
  const proteinTargetG = numberOrNull(draft.proteinTargetG);
  if (kcalTarget !== null && Number.isNaN(kcalTarget)) fields.kcalTarget = "Use a number";
  if (proteinTargetG !== null && Number.isNaN(proteinTargetG)) fields.proteinTargetG = "Use a number";

  const result = createMemberSchema.safeParse({
    name: draft.name,
    sex: draft.sex,
    ageBand: draft.ageBand || null,
    dateOfBirth: draft.dateOfBirth || null,
    kcalTarget: Number.isNaN(kcalTarget) ? null : kcalTarget,
    proteinTargetG: Number.isNaN(proteinTargetG) ? null : proteinTargetG,
    slotIds: draft.slotIds,
  });
  if (!result.success) {
    for (const [name, message] of Object.entries(fromZodError(result.error).fields ?? {})) {
      if (!(name in fields)) fields[name] = message;
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
