import { z } from "zod";
import { isCalendarDate } from "@/lib/dates";
import type { GroceryItem, GroceryList } from "./grocery-list.ts";

export const setCheckSchema = z.object({ checked: z.boolean() }).strict();

// "<weekStart>:<index>", like "2026-10-19:2".
export const listKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}:\d{1,2}$/, "Use a list key like 2026-10-19:0")
  .refine((key) => isCalendarDate(key.slice(0, 10)), "Use a list key like 2026-10-19:0");

export interface GroceryItemView extends GroceryItem {
  checked: boolean;
}

// A grocery list ready for JSON: the shopping time is an ISO string.
export interface GroceryListView extends Omit<GroceryList, "shoppingTime" | "items"> {
  shoppingTime: string;
  items: GroceryItemView[];
}

export interface GroceryLists {
  current: GroceryListView;
  // Newest first.
  previous: GroceryListView[];
  upcoming: GroceryListView[];
}
