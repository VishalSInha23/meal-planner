"use client";

import type { ReactNode } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export interface DialogContentProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

// A sheet from the bottom on phones, centred from 768 px up.
export function DialogContent({ title, description, children }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
      <RadixDialog.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-t-lg border-[1.5px] border-ink bg-paper p-6 text-ink md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <RadixDialog.Title className="text-xl font-semibold">{title}</RadixDialog.Title>
          <RadixDialog.Close asChild>
            <IconButton label="Close" variant="ghost" className="-mt-2 -mr-2">
              <X aria-hidden="true" />
            </IconButton>
          </RadixDialog.Close>
        </div>
        {description && <RadixDialog.Description className="text-ink/75">{description}</RadixDialog.Description>}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
