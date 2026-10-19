import { requireAdmin, requireMember } from "@/lib/auth/session";
import { idParam, parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { updateMemberSchema } from "@/modules/member/member-schema";
import { removeMember, updateMember } from "@/modules/member/member-service";

type Params = { id: string };

export const PATCH = route<Params>(
  async (request, { params }) => {
    const actor = await requireMember();
    const id = await idParam(params);
    const input = await parseBody(request, updateMemberSchema);
    return Response.json(await updateMember(actor, id, input));
  },
  { route: "/api/members/[id]" },
);

export const DELETE = route<Params>(
  async (_request, { params }) => {
    const admin = await requireAdmin();
    await removeMember(admin, await idParam(params));
    return new Response(null, { status: 204 });
  },
  { route: "/api/members/[id]" },
);
