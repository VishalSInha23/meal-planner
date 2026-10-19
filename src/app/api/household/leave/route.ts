import { requireMember, requireUser } from "@/lib/auth/session";
import { parseOptionalBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { leaveHouseholdSchema } from "@/modules/household/household-schema";
import { leave } from "@/modules/household/household-service";

export const POST = route(
  async (request) => {
    const user = await requireUser();
    await requireMember();
    const input = await parseOptionalBody(request, leaveHouseholdSchema);
    await leave(user.id, input);
    return new Response(null, { status: 204 });
  },
  { route: "/api/household/leave" },
);
