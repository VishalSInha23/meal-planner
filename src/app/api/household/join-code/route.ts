import { requireAdmin } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { getJoinCode, regenerateJoinCode } from "@/modules/household/household-service";

export const GET = route(
  async () => {
    const admin = await requireAdmin();
    return Response.json({ code: await getJoinCode(admin.householdId) });
  },
  { route: "/api/household/join-code" },
);

export const POST = route(
  async () => {
    const admin = await requireAdmin();
    return Response.json({ code: await regenerateJoinCode(admin.householdId) });
  },
  { route: "/api/household/join-code" },
);
