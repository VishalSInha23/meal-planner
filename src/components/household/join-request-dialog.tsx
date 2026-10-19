"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { approvalBody, requestSummary, type ApprovalChoice } from "@/components/join/join-helpers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { apiRequest } from "@/lib/http/api-client";
import type { PendingJoinRequest } from "@/modules/join-request/join-request-schema";
import { useApiAction } from "./use-api-action";

// A pending request as the page holds it (the API sends it with a date the page doesn't use).
export type RequestRow = Pick<PendingJoinRequest, "id" | "name" | "sex" | "ageYears">;

export interface JoinRequestDialogProps {
  request: RequestRow;
  // Members without an account: the ones the asker can take over.
  linkable: { id: string; name: string }[];
  onClose: () => void;
}

export function JoinRequestDialog({ request, linkable, onClose }: JoinRequestDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={request.name} description={requestSummary(request)}>
        <JoinRequestBody request={request} linkable={linkable} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function JoinRequestBody({ request, linkable, onClose }: JoinRequestDialogProps) {
  const [choice, setChoice] = useState<ApprovalChoice>("new");
  const [memberId, setMemberId] = useState(linkable[0]?.id);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const approve = useApiAction();
  const decline = useApiAction();
  const busy = approve.busy || decline.busy;
  const failure = approve.failure ?? decline.failure;

  const path = `/api/household/join-requests/${request.id}`;

  async function decide(action: typeof approve, call: () => ReturnType<typeof apiRequest>) {
    const result = await action.run(call);
    if (result.ok) onClose();
  }

  if (confirmingDecline) {
    return (
      <div className="flex flex-col gap-4">
        <p>{request.name} will see that the request was declined.</p>
        {failure && <FieldError id="decline-error">{failure.message}</FieldError>}
        <div className="flex gap-2">
          <Button variant="primary" loading={decline.busy} onClick={() => decide(decline, () => apiRequest("POST", `${path}/decline`))}>
            Decline {request.name}
          </Button>
          <IconButton label="Cancel" disabled={busy} onClick={() => setConfirmingDecline(false)}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    );
  }

  const options = [
    ...(linkable.length > 0 ? [{ value: "link", label: "Link to a member" }] : []),
    { value: "new", label: "Add as a new member" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup
        legend={`How should ${request.name} join?`}
        options={options}
        value={choice}
        onValueChange={(value) => {
          setChoice(value as ApprovalChoice);
          approve.clear();
        }}
        disabled={busy}
        hint={linkable.length > 0 ? "Linking replaces a member's name, sex and date of birth with theirs; the rest stays." : undefined}
      />
      {choice === "link" && (
        <Select
          label="Member"
          options={linkable.map((member) => ({ value: member.id, label: member.name }))}
          value={memberId}
          onValueChange={setMemberId}
          disabled={busy}
        />
      )}
      {failure && <FieldError id="join-request-decision-error">{failure.message}</FieldError>}
      <div className="flex gap-2">
        <IconButton
          label="Approve"
          variant="primary"
          loading={approve.busy}
          disabled={busy}
          onClick={() => decide(approve, () => apiRequest("POST", `${path}/approve`, approvalBody(choice, memberId)))}
        >
          <Check size={20} aria-hidden="true" />
        </IconButton>
        <IconButton label="Decline" disabled={busy} onClick={() => setConfirmingDecline(true)}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
