import { z } from "zod";
import { localToday } from "@/lib/time/week";
import { dateOfBirthProblem, dateOfBirthSchema, memberNameSchema, sexSchema } from "../member/member-schema.ts";

// The details of an account without a household, validated like "About you" in onboarding.
const joinYouSchema = z
  .object({ name: memberNameSchema, sex: sexSchema, dateOfBirth: dateOfBirthSchema })
  .strict()
  .superRefine((you, context) => {
    if (!dateOfBirthSchema.safeParse(you.dateOfBirth).success) return;
    const problem = dateOfBirthProblem(you.dateOfBirth, localToday(new Date()));
    if (problem) context.addIssue({ code: "custom", path: ["dateOfBirth"], message: problem });
  });

export const createJoinRequestSchema = z
  .object({
    code: z.string(),
    you: joinYouSchema.optional(),
    confirmDeleteHousehold: z.boolean().optional(),
  })
  .strict();

export type CreateJoinRequest = z.infer<typeof createJoinRequestSchema>;

export type JoinRequestStatus = "pending" | "approved" | "declined" | "cancelled" | "dismissed";

export interface JoinRequest {
  id: string;
  householdId: string;
  name: string;
  sex: "male" | "female";
  dateOfBirth: string;
  status: JoinRequestStatus;
  createdAt: Date;
  decidedAt: Date | null;
}

// A request as its asker sees it.
export interface MyJoinRequest extends JoinRequest {
  householdName: string;
}
