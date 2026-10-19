import { requireMember } from "@/lib/auth/session";
import { idParam } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { removeMealDish } from "@/modules/meal/meal-service";

type Params = { id: string };

export const DELETE = route<Params>(
  async (_request, { params }) => {
    const member = await requireMember();
    await removeMealDish(member.householdId, await idParam(params));
    return new Response(null, { status: 204 });
  },
  { route: "/api/meal-dishes/[id]" },
);
