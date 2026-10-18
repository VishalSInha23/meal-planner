import { requireAdmin } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { createMealSlotSchema } from "@/modules/meal-slot/meal-slot-schema";
import { addMealSlot } from "@/modules/meal-slot/meal-slot-service";

export const POST = route(
  async (request) => {
    const admin = await requireAdmin();
    const input = await parseBody(request, createMealSlotSchema);
    return Response.json(await addMealSlot(admin.householdId, input), { status: 201 });
  },
  { route: "/api/meal-slots" },
);
