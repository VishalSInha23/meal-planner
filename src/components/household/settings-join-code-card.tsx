"use client";

import { Check, Copy, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { apiRequest } from "@/lib/http/api-client";
import { useApiAction } from "./use-api-action";

const COPIED_MS = 2000;

export function SettingsJoinCodeCard({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const regenerate = useApiAction();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    setCopyError(undefined);
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      setCopyError("Could not copy. Select the code and copy it by hand.");
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  async function makeNew() {
    const result = await regenerate.run(() => apiRequest<{ code: string }>("POST", "/api/household/join-code"));
    if (result.ok) {
      setCode(result.data.code);
      setConfirming(false);
      setCopied(false);
    }
  }

  return (
    <Card title="Join code">
      <p className="text-ink/75">Share this code with people who should join the household. You approve each request.</p>
      <p aria-label="Join code" className="font-mono text-4xl font-semibold tracking-widest break-all select-all">
        {code}
      </p>
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="font-medium">The current code will stop working</p>
          <div className="flex gap-2">
            <IconButton label="Make new code" variant="primary" loading={regenerate.busy} onClick={makeNew}>
              <Check size={20} aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Cancel"
              disabled={regenerate.busy}
              onClick={() => {
                setConfirming(false);
                regenerate.clear();
              }}
            >
              <X size={20} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <IconButton label="Copy code" onClick={copy}>
            <Copy size={20} aria-hidden="true" />
          </IconButton>
          <IconButton label="New code" onClick={() => setConfirming(true)}>
            <RefreshCw size={20} aria-hidden="true" />
          </IconButton>
          <p role="status" className="font-medium">
            {copied && (
              <>
                <span aria-hidden="true">✓ </span>Copied
              </>
            )}
          </p>
        </div>
      )}
      {copyError && <FieldError id="copy-code-error">{copyError}</FieldError>}
      {regenerate.failure && <FieldError id="new-code-error">{regenerate.failure.message}</FieldError>}
    </Card>
  );
}
