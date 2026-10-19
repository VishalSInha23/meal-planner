import { requireMember } from "@/lib/auth/session";
import { parseBody, uuidParam } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { setMealDishMemberSchema } from "@/modules/meal/meal-schema";
import { setMealDishMember } from "@/modules/meal/meal-service";

type Params = { id: string; memberId: string };

export const PUT = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    const mealDishId = await uuidParam(params, "id");
    const memberId = await uuidParam(params, "memberId");
    const { eats, version } = await parseBody(request, setMealDishMemberSchema);
    return Response.json(await setMealDishMember(member.householdId, mealDishId, memberId, eats, version));
  },
  { route: "/api/meal-dishes/[id]/members/[memberId]" },
);
