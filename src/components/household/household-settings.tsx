"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FieldError } from "@/components/ui/field-parts";
import { apiRequest } from "@/lib/http/api-client";
import type { HouseholdOverview } from "@/modules/household/household-schema";
import type { Units } from "@/modules/user-preference/user-preference-schema";
import { SettingsHouseholdCard } from "./settings-household-card";
import { SettingsMembersCard } from "./settings-members-card";
import { SettingsSlotsCard } from "./settings-slots-card";
import { SettingsTripsCard } from "./settings-trips-card";

export interface HouseholdSettingsProps {
  initial: HouseholdOverview;
  // The signed-in user's member.
  meId: string;
  // The signed-in user's height and weight units.
  units: Units;
}

export function HouseholdSettings({ initial, meId, units }: HouseholdSettingsProps) {
  const [overview, setOverview] = useState(initial);
  const [loadError, setLoadError] = useState<string>();
  const viewer = overview.members.find((member) => member.id === meId);

  // After any change the server holds the truth: slot order, member slots after a slot is removed, and so on.
  async function reload() {
    const result = await apiRequest<HouseholdOverview>("GET", "/api/household");
    if (result.ok) {
      setOverview(result.data);
      setLoadError(undefined);
    } else {
      setLoadError(result.message);
    }
  }

  if (!viewer) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back to settings"
          title="Back to settings"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border-[1.5px] border-ink active:bg-ink/15"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-semibold">Household</h1>
      </div>
      {loadError && <FieldError id="reload-error">{loadError}</FieldError>}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SettingsHouseholdCard household={overview.household} isAdmin={viewer.isAdmin} reload={reload} />
        <SettingsSlotsCard slots={overview.mealSlots} isAdmin={viewer.isAdmin} reload={reload} />
        <SettingsTripsCard trips={overview.shoppingTrips} isAdmin={viewer.isAdmin} reload={reload} />
        <SettingsMembersCard overview={overview} viewer={viewer} units={units} reload={reload} />
      </div>
    </div>
  );
}
