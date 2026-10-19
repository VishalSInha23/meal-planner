import { requireMember } from "@/lib/auth/session";
import { idParam, parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { updateDishSchema } from "@/modules/dish/dish-schema";
import { getDish, updateDish } from "@/modules/dish/dish-service";

type Params = { id: string };

export const GET = route<Params>(
  async (_request, { params }) => {
    const member = await requireMember();
    return Response.json(await getDish(member.householdId, await idParam(params)));
  },
  { route: "/api/dishes/[id]" },
);

export const PATCH = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    const id = await idParam(params);
    const input = await parseBody(request, updateDishSchema);
    return Response.json(await updateDish(member.householdId, id, input));
  },
  { route: "/api/dishes/[id]" },
);
