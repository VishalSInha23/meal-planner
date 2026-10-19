import { requireUser } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { createJoinRequestSchema } from "@/modules/join-request/join-request-schema";
import { createJoinRequest } from "@/modules/join-request/join-request-service";

export const POST = route(
  async (request) => {
    const user = await requireUser();
    const input = await parseBody(request, createJoinRequestSchema);
    return Response.json(await createJoinRequest(user.id, input), { status: 201 });
  },
  { route: "/api/join-requests" },
);
