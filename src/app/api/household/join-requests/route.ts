import { requireAdmin } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { listPendingRequests } from "@/modules/join-request/join-request-service";

export const GET = route(
  async () => {
    const admin = await requireAdmin();
    return Response.json(await listPendingRequests(admin.householdId));
  },
  { route: "/api/household/join-requests" },
);
