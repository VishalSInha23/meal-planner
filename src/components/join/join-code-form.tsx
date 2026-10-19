"use client";

import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useApiAction } from "@/components/household/use-api-action";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { apiRequest } from "@/lib/http/api-client";
import { formatJoinCodeInput, joinCodeProblem, joinFailureMessage, type JoinRequestView } from "./join-helpers";

export interface JoinYou {
  name: string;
  sex: "male" | "female";
  dateOfBirth: string;
}

export interface JoinCodeFormProps {
  // The details of an account without a household. An account with one sends none.
  you?: JoinYou;
  // The asker's current household: joining may delete it, and the person must confirm that by name.
  currentHouseholdName?: string;
  onSent: (request: JoinRequestView) => void;
  autoFocus?: boolean;
}

export function JoinCodeForm({ you, currentHouseholdName, onSent, autoFocus }: JoinCodeFormProps) {
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string>();
  const action = useApiAction();
  const failure = action.failure;
  const needsConfirmation = failure?.code === "would_delete_household";

  async function send(confirmDeleteHousehold: boolean) {
    const found = joinCodeProblem(code);
    setProblem(found);
    if (found) return;
    const body = { code, ...(you ? { you } : {}), ...(confirmDeleteHousehold ? { confirmDeleteHousehold } : {}) };
    const result = await action.run(() => apiRequest<JoinRequestView>("POST", "/api/join-requests", body));
    if (result.ok) onSent({ id: result.data.id, status: "pending", householdName: result.data.householdName });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(false);
  }

  const fieldError = problem ?? (failure && !needsConfirmation ? joinFailureMessage(failure) : undefined);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label="Join code"
        hint="Ask an admin of the household for it."
        value={code}
        onChange={(event) => {
          setCode(formatJoinCodeInput(event.target.value));
          setProblem(undefined);
          action.clear();
        }}
        error={fieldError}
        disabled={action.busy}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="font-mono text-xl tracking-widest uppercase"
      />
      {needsConfirmation && failure && (
        <div className="flex flex-col gap-2">
          <FieldError id="join-confirm-message">{failure.message}</FieldError>
          <Button variant="primary" loading={action.busy} onClick={() => void send(true)}>
            Join and delete {currentHouseholdName ?? "your household"}
          </Button>
        </div>
      )}
      {!needsConfirmation && (
        <div>
          <IconButton label="Send request" type="submit" variant="primary" loading={action.busy}>
            <Send size={20} aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </form>
  );
}
