import { requireAdmin } from "@/lib/auth/session";
import { idParam } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { declineJoinRequest } from "@/modules/join-request/join-request-service";

export const POST = route<{ id: string }>(
  async (_request, { params }) => {
    const admin = await requireAdmin();
    await declineJoinRequest(admin, await idParam(params));
    return new Response(null, { status: 204 });
  },
  { route: "/api/household/join-requests/[id]/decline" },
);
