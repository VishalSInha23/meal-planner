"use client";

import { RefreshCw, X } from "lucide-react";
import { useApiAction } from "@/components/household/use-api-action";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { apiRequest } from "@/lib/http/api-client";
import { requestStatusText, type JoinRequestView } from "./join-helpers";

export interface JoinRequestStatusProps {
  request: JoinRequestView;
  title?: string;
  // Called after the request was cancelled or dismissed.
  onResolved: () => void;
  // Given, a pending request offers "Check again": it gets the account's request now, or null when there is none open.
  onChecked?: (request: JoinRequestView | null) => void;
}

export function JoinRequestStatus({ request, title, onResolved, onChecked }: JoinRequestStatusProps) {
  const cancel = useApiAction();
  const dismiss = useApiAction();
  const check = useApiAction();
  const busy = cancel.busy || dismiss.busy || check.busy;
  const failure = cancel.failure ?? dismiss.failure ?? check.failure;

  async function resolve(action: typeof cancel, request: () => ReturnType<typeof apiRequest>) {
    const result = await action.run(request);
    if (result.ok) onResolved();
  }

  async function checkAgain() {
    const result = await check.run(() => apiRequest<JoinRequestView | null>("GET", "/api/join-requests/mine"));
    if (result.ok) onChecked?.(result.data);
  }

  return (
    <Card title={title}>
      <p role="status">{requestStatusText(request)}</p>
      <div className="flex gap-2">
        {request.status === "pending" ? (
          <>
            {onChecked && (
              <IconButton label="Check again" loading={check.busy} disabled={busy} onClick={checkAgain}>
                <RefreshCw size={20} aria-hidden="true" />
              </IconButton>
            )}
            <IconButton
              label="Cancel request"
              loading={cancel.busy}
              disabled={busy}
              onClick={() => resolve(cancel, () => apiRequest("DELETE", "/api/join-requests/mine"))}
            >
              <X size={20} aria-hidden="true" />
            </IconButton>
          </>
        ) : (
          <IconButton
            label="Dismiss"
            loading={dismiss.busy}
            disabled={busy}
            onClick={() => resolve(dismiss, () => apiRequest("POST", "/api/join-requests/mine/dismiss"))}
          >
            <X size={20} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {failure && <FieldError id="join-request-error">{failure.message}</FieldError>}
    </Card>
  );
}
