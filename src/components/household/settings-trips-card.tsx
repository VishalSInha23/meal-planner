"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { apiRequest } from "@/lib/http/api-client";
import { fromZodError } from "@/lib/http/errors";
import { createShoppingTripSchema, type ShoppingTrip } from "@/modules/shopping-trip/shopping-trip-schema";
import type { FieldErrors } from "./member-draft";
import { TripRow, tripLabel } from "./trip-row";
import { rowMessage, useApiAction } from "./use-api-action";

export interface SettingsTripsCardProps {
  trips: ShoppingTrip[];
  isAdmin: boolean;
  reload: () => Promise<void>;
}

export function SettingsTripsCard({ trips, isAdmin, reload }: SettingsTripsCardProps) {
  return (
    <Card title="Shopping trips">
      {trips.length === 0 && <p className="text-ink/75">No shopping trips.</p>}
      <ul className="flex flex-col gap-2">
        {trips.map((trip) => (
          <ExistingTrip key={trip.id} trip={trip} isAdmin={isAdmin} reload={reload} />
        ))}
      </ul>
      {isAdmin && <NewTrip reload={reload} />}
    </Card>
  );
}

function ExistingTrip({ trip, isAdmin, reload }: { trip: ShoppingTrip; isAdmin: boolean; reload: () => Promise<void> }) {
  const action = useApiAction();
  const message = rowMessage(action.failure);

  async function remove() {
    const result = await action.run(() => apiRequest("DELETE", `/api/shopping-trips/${trip.id}`));
    if (result.ok) await reload();
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <span>{tripLabel(trip.dayOfWeek, trip.time)}</span>
        {isAdmin && (
          <IconButton label={`Remove ${tripLabel(trip.dayOfWeek, trip.time)}`} loading={action.busy} onClick={remove}>
            <Trash2 size={20} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {message && <FieldError id={`${trip.id}-error`}>{message}</FieldError>}
    </li>
  );
}

function NewTrip({ reload }: { reload: () => Promise<void> }) {
  const [dayOfWeek, setDayOfWeek] = useState(6);
  const [time, setTime] = useState("10:00");
  const [errors, setErrors] = useState<FieldErrors>({});
  const action = useApiAction();

  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setErrors({});
      action.clear();
    };
  }

  async function add() {
    const parsed = createShoppingTripSchema.safeParse({ dayOfWeek, time });
    if (!parsed.success) {
      setErrors(fromZodError(parsed.error).fields ?? {});
      return;
    }
    const result = await action.run(() => apiRequest("POST", "/api/shopping-trips", parsed.data));
    if (result.ok) await reload();
  }

  return (
    <div className="flex flex-col gap-2 border-t-[1.5px] border-ink pt-4">
      <p className="font-medium">New shopping trip</p>
      <TripRow
        dayOfWeek={dayOfWeek}
        time={time}
        onDayChange={edit(setDayOfWeek)}
        onTimeChange={edit(setTime)}
        disabled={action.busy}
        errors={{
          dayOfWeek: errors.dayOfWeek ?? action.failure?.fields.dayOfWeek,
          time: errors.time ?? action.failure?.fields.time,
          row: rowMessage(action.failure),
        }}
        actions={
          <IconButton label="Add shopping trip" variant="primary" loading={action.busy} onClick={add}>
            <Plus size={20} aria-hidden="true" />
          </IconButton>
        }
      />
    </div>
  );
}
