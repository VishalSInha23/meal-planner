import { requireMember } from "@/lib/auth/session";
import { idParam, parseQuery } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { removeMealDishQuerySchema } from "@/modules/meal/meal-schema";
import { removeMealDish } from "@/modules/meal/meal-service";

type Params = { id: string };

export const DELETE = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    const mealDishId = await idParam(params);
    const { version } = parseQuery(request, removeMealDishQuerySchema);
    await removeMealDish(member.householdId, mealDishId, version);
    return new Response(null, { status: 204 });
  },
  { route: "/api/meal-dishes/[id]" },
);
