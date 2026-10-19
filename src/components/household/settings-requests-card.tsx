"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { requestSummary } from "@/components/join/join-helpers";
import { Card } from "@/components/ui/card";
import { JoinRequestDialog, type RequestRow } from "./join-request-dialog";

export interface SettingsRequestsCardProps {
  requests: RequestRow[];
  linkable: { id: string; name: string }[];
  // Fetches the household and its requests again; runs when the dialog closes, since approving changes both.
  reload: () => Promise<void>;
}

export function SettingsRequestsCard({ requests, linkable, reload }: SettingsRequestsCardProps) {
  const [open, setOpen] = useState<RequestRow | null>(null);
  if (requests.length === 0 && !open) return null;
  return (
    <Card title="Requests to join" className="md:col-span-2">
      <ul className="grid gap-2 md:grid-cols-2">
        {requests.map((request) => (
          <li key={request.id}>
            <button
              type="button"
              onClick={() => setOpen(request)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-ink px-3 py-2 text-left active:bg-ink/15"
            >
              <span className="flex flex-col">
                <span className="font-medium">{request.name}</span>
                <span className="text-ink/75">{requestSummary(request)}</span>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <JoinRequestDialog
          key={open.id}
          request={open}
          linkable={linkable}
          onClose={() => {
            setOpen(null);
            void reload();
          }}
        />
      )}
    </Card>
  );
}
