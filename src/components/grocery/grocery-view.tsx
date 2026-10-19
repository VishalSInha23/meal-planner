"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/http/api-client";
import type { GroceryListView } from "@/modules/grocery-check/grocery-check-schema";
import { dishesLabel } from "./grocery-format";

// A list with its labels already written, so the server and the browser show the same text.
export interface GroceryListCardData extends GroceryListView {
  period: string | null;
  shop: string;
}

export interface GroceryViewProps {
  current: GroceryListCardData;
  upcoming: GroceryListCardData[];
  previous: GroceryListCardData[];
}

const itemId = (listKey: string, ingredientId: string) => `${listKey}|${ingredientId}`;

export function GroceryView({ current, upcoming, previous }: GroceryViewProps) {
  const all = [current, ...upcoming, ...previous];
  const [checked, setChecked] = useState(
    () => new Set(all.flatMap((list) => list.items.filter((item) => item.checked).map((item) => itemId(list.key, item.ingredientId)))),
  );
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function change(listKey: string, ingredientId: string, value: boolean) {
    const id = itemId(listKey, ingredientId);
    setSaving((previousSaving) => new Set(previousSaving).add(id));
    setErrors((previousErrors) => {
      const next = { ...previousErrors };
      delete next[id];
      return next;
    });
    const result = await apiRequest("PUT", `/api/grocery-lists/${encodeURIComponent(listKey)}/checks/${ingredientId}`, { checked: value });
    setSaving((previousSaving) => {
      const next = new Set(previousSaving);
      next.delete(id);
      return next;
    });
    if (!result.ok) {
      setErrors((previousErrors) => ({ ...previousErrors, [id]: result.message }));
      return;
    }
    setChecked((previousChecked) => {
      const next = new Set(previousChecked);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const lists = (items: GroceryListCardData[], empty: string) =>
    items.length === 0 ? (
      <p>{empty}</p>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((list) => (
          <GroceryListCard key={list.key} list={list} checked={checked} saving={saving} errors={errors} onChange={change} />
        ))}
      </div>
    );

  return (
    <Tabs defaultValue="current">
      <TabsList>
        <TabsTrigger value="current">Current</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        <TabsTrigger value="previous">Previous</TabsTrigger>
      </TabsList>
      <TabsContent value="current">{lists([current], "")}</TabsContent>
      <TabsContent value="upcoming">{lists(upcoming, "No upcoming lists")}</TabsContent>
      <TabsContent value="previous">{lists(previous, "No previous lists")}</TabsContent>
    </Tabs>
  );
}

interface GroceryListCardProps {
  list: GroceryListCardData;
  checked: Set<string>;
  saving: Set<string>;
  errors: Record<string, string>;
  onChange: (listKey: string, ingredientId: string, value: boolean) => void;
}

function GroceryListCard({ list, checked, saving, errors, onChange }: GroceryListCardProps) {
  return (
    <Card title={list.period ?? "No meals"}>
      <p>{list.shop}</p>
      {list.items.length === 0 ? (
        <p>Nothing to buy for this period</p>
      ) : (
        <ul className="flex flex-col">
          {list.items.map((item) => {
            const id = itemId(list.key, item.ingredientId);
            const isChecked = checked.has(id);
            return (
              <li key={item.ingredientId}>
                <Checkbox
                  label={<span className={isChecked ? "line-through" : undefined}>{item.name}</span>}
                  hint={dishesLabel(item.dishNames)}
                  checked={isChecked}
                  loading={saving.has(id)}
                  error={errors[id]}
                  onCheckedChange={(value) => onChange(list.key, item.ingredientId, value)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
