"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import type { HouseholdOverview } from "@/modules/household/household-schema";
import type { MemberWithSlots } from "@/modules/member/member-schema";
import { MemberDialog } from "./member-dialog";

export interface SettingsMembersCardProps {
  overview: HouseholdOverview;
  viewer: MemberWithSlots;
  reload: () => Promise<void>;
}

// null = closed, "new" = adding a member without an account, otherwise the id being edited.
type Open = null | "new" | string;

function summary(member: MemberWithSlots, overview: HouseholdOverview): string {
  const parts: string[] = [];
  if (member.isAdmin) parts.push("Admin");
  parts.push(member.dateOfBirth ? `Born ${member.dateOfBirth}` : `Age ${member.ageBand}`);
  const names = overview.mealSlots.filter((slot) => member.slotIds.includes(slot.id)).map((slot) => slot.name);
  parts.push(`Eats in ${names.join(", ")}`);
  return parts.join(" · ");
}

export function SettingsMembersCard({ overview, viewer, reload }: SettingsMembersCardProps) {
  const [open, setOpen] = useState<Open>(null);
  const editing = open && open !== "new" ? (overview.members.find((member) => member.id === open) ?? null) : null;
  return (
    <Card
      title="Members"
      className="md:col-span-2"
      actions={
        viewer.isAdmin && (
          <IconButton label="Add member" onClick={() => setOpen("new")}>
            <Plus size={20} aria-hidden="true" />
          </IconButton>
        )
      }
    >
      <ul className="grid gap-2 md:grid-cols-2">
        {overview.members.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => setOpen(member.id)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-ink px-3 py-2 text-left active:bg-ink/15"
            >
              <span className="flex flex-col">
                <span className="font-medium">
                  {member.name}
                  {member.id === viewer.id && " (you)"}
                </span>
                <span className="text-ink/75">{summary(member, overview)}</span>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {(open === "new" || editing) && (
        <MemberDialog
          key={editing?.id ?? "new"}
          member={editing}
          overview={overview}
          viewer={viewer}
          reload={reload}
          onClose={() => setOpen(null)}
        />
      )}
    </Card>
  );
}
