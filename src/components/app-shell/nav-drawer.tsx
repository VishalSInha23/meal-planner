"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { IconButton } from "@/components/ui/icon-button";
import { BrandLink } from "./brand-link";
import { NavMenu } from "./nav-menu";

// The menu on phones: slides in from the left. Closes on navigation, Escape and a tap outside.
export function NavDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <IconButton label="Open menu" className="md:hidden">
          <Menu size={20} />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50 md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r-[1.5px] border-ink bg-paper p-4 text-ink md:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex items-center justify-between gap-2">
            <BrandLink />
            <Dialog.Close asChild>
              <IconButton label="Close menu" variant="ghost">
                <X size={20} />
              </IconButton>
            </Dialog.Close>
          </div>
          <NavMenu onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
