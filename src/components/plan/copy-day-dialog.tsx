"use client";

import { Copy, CopyPlus } from "lucide-react";
import { useState } from "react";
import { useApiAction } from "@/components/household/use-api-action";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { apiRequest } from "@/lib/http/api-client";
import { addDaysTo } from "@/lib/time/week";
import { copiedLabel, longDay } from "./plan-format";
import { useReloadAfterChange } from "./use-week";

export interface CopyDayDialogProps {
  // The day to copy.
  date: string;
  reload: () => Promise<void>;
}

export function CopyDayDialog({ date, reload }: CopyDayDialogProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(addDaysTo(date, 1));
  const [copied, setCopied] = useState<string | null>(null);
  const copying = useApiAction();
  const { pending, reloadNow } = useReloadAfterChange(reload);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setTarget(addDaysTo(date, 1));
      setCopied(null);
      copying.clear();
    }
  }

  async function copy() {
    setCopied(null);
    const result = await copying.run(() => apiRequest<{ addedDishes: number }>("POST", `/api/days/${target}/copy`, { fromDate: date }));
    if (!result.ok) return;
    setCopied(copiedLabel(result.data.addedDishes));
    await reloadNow();
  }

  const failure = copying.failure;
  const fieldError = failure
    ? (failure.fields.date ?? failure.fields.fromDate ?? (Object.keys(failure.fields).length === 0 ? failure.message : undefined))
    : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <IconButton label="Copy day">
          <CopyPlus size={20} aria-hidden="true" />
        </IconButton>
      </DialogTrigger>
      <DialogContent title={`Copy ${longDay(date)}`}>
        <TextField label="Copy to" type="date" required value={target} onChange={(event) => setTarget(event.target.value)} error={fieldError} />
        <div className="flex items-center gap-3">
          <IconButton label="Copy" variant="primary" loading={copying.busy} disabled={pending || target === ""} onClick={() => void copy()}>
            <Copy size={20} aria-hidden="true" />
          </IconButton>
          {copied && <p role="status">{copied}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
