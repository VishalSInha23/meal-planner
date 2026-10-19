import { requireUser } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { cancelMyJoinRequest, getMyJoinRequest } from "@/modules/join-request/join-request-service";

export const GET = route(
  async () => {
    const user = await requireUser();
    return Response.json(await getMyJoinRequest(user.id));
  },
  { route: "/api/join-requests/mine" },
);

export const DELETE = route(
  async () => {
    const user = await requireUser();
    await cancelMyJoinRequest(user.id);
    return new Response(null, { status: 204 });
  },
  { route: "/api/join-requests/mine" },
);
