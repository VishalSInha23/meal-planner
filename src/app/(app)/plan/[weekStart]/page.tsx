import { redirect } from "next/navigation";
import { PlanView } from "@/components/plan/plan-view";
import { requireMember } from "@/lib/auth/session";
import { isCalendarDate } from "@/lib/dates";
import { defaultPlannerWeek, isWeekStart, localToday, weekStartFor } from "@/lib/time/week";
import { getWeek } from "@/modules/meal/meal-service";
import { listMembers } from "@/modules/member/member-service";

export default async function PlanWeekPage({ params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;
  const member = await requireMember();
  const { weekStartDay } = member.household;
  const now = new Date();
  if (!isCalendarDate(weekStart)) redirect(`/plan/${defaultPlannerWeek(now, weekStartDay)}`);
  if (!isWeekStart(weekStart, weekStartDay)) redirect(`/plan/${weekStartFor(weekStart, weekStartDay)}`);

  const today = localToday(now);
  const [week, members] = await Promise.all([getWeek(member.householdId, weekStart), listMembers(member.householdId)]);
  return (
    <PlanView
      week={week}
      members={members.map(({ id, name, kcalTarget, proteinTargetG }) => ({ id, name, kcalTarget, proteinTargetG }))}
      today={today}
      currentWeekStart={weekStartFor(today, weekStartDay)}
    />
  );
}
