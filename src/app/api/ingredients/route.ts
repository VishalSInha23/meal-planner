import { requireMember } from "@/lib/auth/session";
import { parseQuery } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { ingredientSearchSchema } from "@/modules/ingredient/ingredient-schema";
import { searchIngredients } from "@/modules/ingredient/ingredient-service";

export const GET = route(
  async (request) => {
    const member = await requireMember();
    const { query } = parseQuery(request, ingredientSearchSchema);
    return Response.json(await searchIngredients(member.householdId, query));
  },
  { route: "/api/ingredients" },
);
