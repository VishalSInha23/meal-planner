import { requireMember } from "@/lib/auth/session";
import { parseBody, uuidParam } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { setCheckSchema } from "@/modules/grocery-check/grocery-check-schema";
import { setCheck } from "@/modules/grocery-check/grocery-check-service";

type Params = { key: string; ingredientId: string };

export const PUT = route<Params>(
  async (request, { params }) => {
    const member = await requireMember();
    const { key } = await params;
    const ingredientId = await uuidParam(params, "ingredientId");
    const { checked } = await parseBody(request, setCheckSchema);
    await setCheck(member.householdId, member.id, key, ingredientId, checked);
    return Response.json({ key, ingredientId, checked });
  },
  { route: "/api/grocery-lists/[key]/checks/[ingredientId]" },
);
