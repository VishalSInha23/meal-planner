import { GroceryView } from "@/components/grocery/grocery-view";
import { periodLabel, shopLabel } from "@/components/grocery/grocery-format";
import { requireMember } from "@/lib/auth/session";
import type { GroceryListView } from "@/modules/grocery-check/grocery-check-schema";
import { getGroceryLists } from "@/modules/grocery-check/grocery-check-service";

export default async function GroceriesPage() {
  const member = await requireMember();
  const now = new Date();
  const lists = await getGroceryLists(member.householdId, now);
  const labelled = (list: GroceryListView) => ({ ...list, period: periodLabel(list), shop: shopLabel(list, now) });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Groceries</h1>
      <GroceryView current={labelled(lists.current)} upcoming={lists.upcoming.map(labelled)} previous={lists.previous.map(labelled)} />
    </div>
  );
}
