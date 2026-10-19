import { requireMember } from "@/lib/auth/session";
import { jsonWithEtag } from "@/lib/http/etag";
import { route } from "@/lib/http/route";
import { getWeek } from "@/modules/meal/meal-service";

type Params = { weekStart: string };

export const GET = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    return jsonWithEtag(request, await getWeek(member.householdId, (await params).weekStart));
  },
  { route: "/api/weeks/[weekStart]" },
);
