import { requireAdmin } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { createMemberSchema } from "@/modules/member/member-schema";
import { addMember } from "@/modules/member/member-service";

export const POST = route(
  async (request) => {
    const admin = await requireAdmin();
    const input = await parseBody(request, createMemberSchema);
    return Response.json(await addMember(admin.householdId, input), { status: 201 });
  },
  { route: "/api/members" },
);
