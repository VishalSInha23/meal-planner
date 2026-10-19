import { DishesView } from "@/components/dish/dishes-view";
import { requireMember } from "@/lib/auth/session";
import { listDishes } from "@/modules/dish/dish-service";

export default async function DishesPage() {
  const member = await requireMember();
  const dishes = await listDishes(member.householdId, { query: "", archived: false });
  return <DishesView initial={dishes} />;
}
