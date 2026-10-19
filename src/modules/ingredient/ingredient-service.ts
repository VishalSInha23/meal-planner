import type { DbOrTx } from "@/db/transaction";
import * as repository from "./ingredient-repository.ts";
import type { Ingredient } from "./ingredient-schema.ts";

const SUGGESTION_LIMIT = 10;

export function searchIngredients(householdId: string, text: string): Promise<Ingredient[]> {
  return repository.search(householdId, text, SUGGESTION_LIMIT);
}

const lowerKey = (name: string) => name.trim().toLowerCase();

// Turns names into ingredient ids: names are matched to the household's ingredients ignoring case
// (the stored spelling wins), unknown names are created, and repeated names count once.
export async function resolveIngredientIds(householdId: string, names: string[], db: DbOrTx): Promise<string[]> {
  const wanted = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!wanted.has(lowerKey(trimmed))) wanted.set(lowerKey(trimmed), trimmed);
  }
  const keys = [...wanted.keys()];
  const existing = new Set((await repository.findByLowerNames(householdId, keys, db)).map((item) => lowerKey(item.name)));
  await repository.insertMany(
    householdId,
    keys.filter((item) => !existing.has(item)).map((item) => wanted.get(item)!),
    db,
  );
  return (await repository.findByLowerNames(householdId, keys, db)).map((item) => item.id);
}
