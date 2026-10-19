import { requireMember } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { markWeekPlanned, unmarkWeekPlanned } from "@/modules/week-plan/week-plan-service";

type Params = { weekStart: string };

export const PUT = route<Params>(
  async (_request, { params }) => {
    const member = await requireMember();
    return Response.json(await markWeekPlanned(member.householdId, member.id, (await params).weekStart));
  },
  { route: "/api/weeks/[weekStart]/planned" },
);

export const DELETE = route<Params>(
  async (_request, { params }) => {
    const member = await requireMember();
    await unmarkWeekPlanned(member.householdId, (await params).weekStart);
    return new Response(null, { status: 204 });
  },
  { route: "/api/weeks/[weekStart]/planned" },
);
