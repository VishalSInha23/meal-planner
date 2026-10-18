import { requireAdmin } from "@/lib/auth/session";
import { parseBody } from "@/lib/http/request";
import { route } from "@/lib/http/route";
import { createShoppingTripSchema } from "@/modules/shopping-trip/shopping-trip-schema";
import { addShoppingTrip } from "@/modules/shopping-trip/shopping-trip-service";

export const POST = route(
  async (request) => {
    const admin = await requireAdmin();
    const input = await parseBody(request, createShoppingTripSchema);
    return Response.json(await addShoppingTrip(admin.householdId, input), { status: 201 });
  },
  { route: "/api/shopping-trips" },
);
