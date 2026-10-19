import { requireMember } from "@/lib/auth/session";
import { route } from "@/lib/http/route";
import { getGroceryLists } from "@/modules/grocery-check/grocery-check-service";

export const GET = route(
  async () => {
    const member = await requireMember();
    return Response.json(await getGroceryLists(member.householdId, new Date()));
  },
  { route: "/api/grocery-lists" },
);
