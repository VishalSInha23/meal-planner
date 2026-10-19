import { redirect } from "next/navigation";
import { PlanView } from "@/components/plan/plan-view";
import { requireMember } from "@/lib/auth/session";
import { getAppConfig } from "@/lib/config";
import { isCalendarDate } from "@/lib/dates";
import { defaultPlannerWeek, isWeekStart, localToday, weekStartFor } from "@/lib/time/week";
import { getWeek } from "@/modules/meal/meal-service";

export default async function PlanWeekPage({ params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;
  const member = await requireMember();
  const { weekStartDay } = member.household;
  const now = new Date();
  if (!isCalendarDate(weekStart)) redirect(`/plan/${defaultPlannerWeek(now, weekStartDay)}`);
  if (!isWeekStart(weekStart, weekStartDay)) redirect(`/plan/${weekStartFor(weekStart, weekStartDay)}`);

  const today = localToday(now);
  const week = await getWeek(member.householdId, weekStart);
  return (
    <PlanView
      key={weekStart}
      week={week}
      refreshSeconds={getAppConfig().plannerRefreshSeconds}
      today={today}
      currentWeekStart={weekStartFor(today, weekStartDay)}
    />
  );
}
