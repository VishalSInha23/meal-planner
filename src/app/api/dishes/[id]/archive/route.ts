import { requireMember } from "@/lib/auth/session";
import { idParam } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { setDishArchived } from "@/modules/dish/dish-service";

export const POST = route<{ id: string }>(
  async (_request, { params }) => {
    const member = await requireMember();
    return Response.json(await setDishArchived(member.householdId, await idParam(params), true));
  },
  { route: "/api/dishes/[id]/archive" },
);
