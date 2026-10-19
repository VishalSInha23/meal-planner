import { requireMember } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { copyWeekSchema } from "@/modules/meal/meal-schema";
import { copyWeek } from "@/modules/meal/meal-service";

type Params = { weekStart: string };

export const POST = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    const { fromWeekStart } = await parseBody(request, copyWeekSchema);
    return Response.json(await copyWeek(member.householdId, (await params).weekStart, fromWeekStart));
  },
  { route: "/api/weeks/[weekStart]/copy" },
);
