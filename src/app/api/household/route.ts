import { requireAdmin, requireMember, requireUser } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import {
  getHouseholdOverview,
  createHousehold,
  updateHousehold,
} from "@/modules/household/household-service";
import { onboardingSchema, updateHouseholdSchema } from "@/modules/household/household-schema";

export const GET = route(
  async () => {
    const member = await requireMember();
    return Response.json(await getHouseholdOverview(member.householdId));
  },
  { route: "/api/household" },
);

export const POST = route(
  async (request) => {
    const user = await requireUser();
    const input = await parseBody(request, onboardingSchema);
    return Response.json(await createHousehold(user.id, input), { status: 201 });
  },
  { route: "/api/household" },
);

export const PATCH = route(
  async (request) => {
    const admin = await requireAdmin();
    const input = await parseBody(request, updateHouseholdSchema);
    return Response.json(await updateHousehold(admin.householdId, input));
  },
  { route: "/api/household" },
);
