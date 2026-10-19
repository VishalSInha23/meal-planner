"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { leaveStep } from "@/components/join/join-helpers";
import { ActionCard } from "@/components/ui/action-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { apiRequest } from "@/lib/http/api-client";
import { useApiAction } from "./use-api-action";

export function SettingsLeaveCard({ householdName }: { householdName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionCard
        title="Leave household"
        description="You go back to onboarding and can join again with a join code"
        onClick={() => setOpen(true)}
        className="md:col-span-2"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Leave household">
          <LeaveBody householdName={householdName} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeaveBody({ householdName, onCancel }: { householdName: string; onCancel: () => void }) {
  const router = useRouter();
  const action = useApiAction();
  const step = leaveStep(householdName, action.failure);

  async function leave() {
    const body = step.confirmDeleteHousehold ? { confirmDeleteHousehold: true } : undefined;
    const result = await action.run(() => apiRequest("POST", "/api/household/leave", body));
    if (result.ok) router.replace("/onboarding");
  }

  return (
    <div className="flex flex-col gap-4">
      {!step.confirmDeleteHousehold && <p>You will no longer see {householdName}.</p>}
      {step.message && <FieldError id="leave-error">{step.message}</FieldError>}
      <div className="flex gap-2">
        <Button variant="primary" loading={action.busy} onClick={leave}>
          {step.confirmLabel}
        </Button>
        <IconButton label="Cancel" disabled={action.busy} onClick={onCancel}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
