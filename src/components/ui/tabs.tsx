"use client";

import type { ComponentProps } from "react";
import { Tabs as RadixTabs } from "radix-ui";

export const Tabs = RadixTabs.Root;

export function TabsList({ className = "", ...props }: ComponentProps<typeof RadixTabs.List>) {
  return <RadixTabs.List className={`flex border-b-[1.5px] border-ink ${className}`} {...props} />;
}

// The active tab is bold and underlined, so it does not depend on colour.
export function TabsTrigger({ className = "", ...props }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={`min-h-11 flex-1 px-3 text-base underline-offset-8 active:bg-ink/15 data-[state=active]:font-semibold data-[state=active]:underline data-[state=active]:decoration-2 ${className}`}
      {...props}
    />
  );
}

export function TabsContent({ className = "", ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={`pt-4 ${className}`} {...props} />;
}
