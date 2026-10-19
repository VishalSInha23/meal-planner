import { requireUser } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { dismissMyJoinRequest } from "@/modules/join-request/join-request-service";

export const POST = route(
  async () => {
    const user = await requireUser();
    await dismissMyJoinRequest(user.id);
    return new Response(null, { status: 204 });
  },
  { route: "/api/join-requests/mine/dismiss" },
);
