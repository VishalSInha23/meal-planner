"use client";

import { useState } from "react";
import { ActionCard } from "@/components/ui/action-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { JoinCodeForm } from "./join-code-form";
import type { JoinRequestView } from "./join-helpers";
import { JoinRequestStatus } from "./join-request-status";

export interface SettingsJoinProps {
  householdName: string;
  initialRequest: JoinRequestView | null;
}

// In the app settings: the card to ask another household, and the status of a pending or declined request.
export function SettingsJoin({ householdName, initialRequest }: SettingsJoinProps) {
  const [request, setRequest] = useState(initialRequest);
  const [open, setOpen] = useState(false);
  return (
    <>
      {request && <JoinRequestStatus title="Join request" request={request} onResolved={() => setRequest(null)} />}
      {request?.status !== "pending" && (
        <ActionCard
          title="Join another household"
          description="Ask to join with a join code"
          onClick={() => setOpen(true)}
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Join another household" description="Joining leaves your current household once an admin approves.">
          <JoinCodeForm
            autoFocus
            currentHouseholdName={householdName}
            onSent={(sent) => {
              setRequest(sent);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
