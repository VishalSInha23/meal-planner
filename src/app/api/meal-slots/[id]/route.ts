import { requireAdmin } from "@/lib/auth/session";
import { idParam, parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { updateMealSlotSchema } from "@/modules/meal-slot/meal-slot-schema";
import { removeMealSlot, updateMealSlot } from "@/modules/meal-slot/meal-slot-service";

type Params = { id: string };

export const PATCH = route<Params>(
  async (request, { params }) => {
    const admin = await requireAdmin();
    const id = await idParam(params);
    const input = await parseBody(request, updateMealSlotSchema);
    return Response.json(await updateMealSlot(admin.householdId, id, input));
  },
  { route: "/api/meal-slots/[id]" },
);

export const DELETE = route<Params>(
  async (_request, { params }) => {
    const admin = await requireAdmin();
    await removeMealSlot(admin.householdId, await idParam(params));
    return new Response(null, { status: 204 });
  },
  { route: "/api/meal-slots/[id]" },
);
