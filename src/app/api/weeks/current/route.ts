import { requireMember } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { defaultPlannerWeek } from "@/lib/time/week";

export const GET = route(
  async () => {
    const { household } = await requireMember();
    return Response.json({ weekStart: defaultPlannerWeek(new Date(), household.weekStartDay) });
  },
  { route: "/api/weeks/current" },
);
