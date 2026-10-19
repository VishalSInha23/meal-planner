"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Reloads the week from the server. Pending until the new data has arrived.
export function useWeekRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return { pending, refresh: () => startTransition(() => router.refresh()) };
}
