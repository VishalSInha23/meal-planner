import { requireAdmin } from "@/lib/auth/session";
import { idParam } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { removeShoppingTrip } from "@/modules/shopping-trip/shopping-trip-service";

export const DELETE = route<{ id: string }>(
  async (_request, { params }) => {
    const admin = await requireAdmin();
    await removeShoppingTrip(admin.householdId, await idParam(params));
    return new Response(null, { status: 204 });
  },
  { route: "/api/shopping-trips/[id]" },
);
