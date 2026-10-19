import { requireMember } from "@/lib/auth/session";
import { parseBody, parseQuery } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { createDishSchema, listDishesSchema } from "@/modules/dish/dish-schema";
import { createDish, listDishes } from "@/modules/dish/dish-service";

export const GET = route(
  async (request) => {
    const member = await requireMember();
    return Response.json(await listDishes(member.householdId, parseQuery(request, listDishesSchema)));
  },
  { route: "/api/dishes" },
);

export const POST = route(
  async (request) => {
    const member = await requireMember();
    const input = await parseBody(request, createDishSchema);
    return Response.json(await createDish(member.householdId, input), { status: 201 });
  },
  { route: "/api/dishes" },
);
