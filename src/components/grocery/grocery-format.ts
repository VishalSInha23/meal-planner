import { format } from "date-fns";
import { shortDay } from "@/components/plan/plan-format";
import type { GroceryListView } from "@/modules/grocery-check/grocery-check-schema";

// "Wed 21 Oct breakfast – Fri 23 Oct breakfast", or null when no meal time falls in the list.
export function periodLabel(list: Pick<GroceryListView, "from" | "to">): string | null {
  const { from, to } = list;
  if (!from || !to) return null;
  const point = (occurrence: NonNullable<typeof from>) => `${shortDay(occurrence.date)} ${occurrence.slotName.toLowerCase()}`;
  return `${point(from)} – ${point(to)}`;
}

// "Shop Tue 20 Oct, 21:00". A first list nobody has planned yet starts at the week start, so it says when to plan instead.
export function shopLabel(list: Pick<GroceryListView, "shoppingTime" | "shoppingReason" | "index">, now: Date): string {
  const time = new Date(list.shoppingTime);
  const day = shortDay(format(time, "yyyy-MM-dd"));
  if (list.index === 0 && list.shoppingReason === "week_start" && time.getTime() > now.getTime()) {
    return `Shop when the week is planned, by ${day}`;
  }
  return `Shop ${day}, ${format(time, "HH:mm")}`;
}

// "for dal, cauliflower curry".
export function dishesLabel(dishNames: string[]): string {
  return `for ${dishNames.join(", ").toLowerCase()}`;
}
