import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { defaultPlannerWeek } from "@/lib/time/week";

export default async function PlanPage() {
  const { household } = await requireMember();
  redirect(`/plan/${defaultPlannerWeek(new Date(), household.timezone, household.weekStartDay)}`);
}
