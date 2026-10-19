import { requireMember } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { addMealDishSchema } from "@/modules/meal/meal-schema";
import { addDishToMeal } from "@/modules/meal/meal-service";

export const POST = route(
  async (request) => {
    const member = await requireMember();
    const input = await parseBody(request, addMealDishSchema);
    return Response.json(await addDishToMeal(member.householdId, input), { status: 201 });
  },
  { route: "/api/meal-dishes" },
);
