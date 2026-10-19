import { requireMember } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { copyDaySchema } from "@/modules/meal/meal-schema";
import { copyDay } from "@/modules/meal/meal-service";

type Params = { date: string };

export const POST = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    const { fromDate } = await parseBody(request, copyDaySchema);
    return Response.json(await copyDay(member.householdId, (await params).date, fromDate));
  },
  { route: "/api/days/[date]/copy" },
);
