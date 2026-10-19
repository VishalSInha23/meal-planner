import { requireMember } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { getWeek } from "@/modules/meal/meal-service";

type Params = { weekStart: string };

export const GET = route<Params>(
  async (_request, { params }) => {
    const member = await requireMember();
    return Response.json(await getWeek(member.householdId, (await params).weekStart));
  },
  { route: "/api/weeks/[weekStart]" },
);
