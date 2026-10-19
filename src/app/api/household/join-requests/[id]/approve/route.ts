import { requireAdmin } from "@/lib/auth/session";
import { idParam, parseOptionalBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { approveJoinRequestSchema } from "@/modules/join-request/join-request-schema";
import { approveJoinRequest } from "@/modules/join-request/join-request-service";

export const POST = route<{ id: string }>(
  async (request, { params }) => {
    const admin = await requireAdmin();
    const id = await idParam(params);
    const input = await parseOptionalBody(request, approveJoinRequestSchema);
    return Response.json(await approveJoinRequest(admin, id, input));
  },
  { route: "/api/household/join-requests/[id]/approve" },
);
