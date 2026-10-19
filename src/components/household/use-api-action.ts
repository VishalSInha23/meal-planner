"use client";

import { useState } from "react";
import type { ApiFailure, ApiResult } from "@/lib/http/api-client";

// Tracks one async API action: busy while it runs, and the failure of the last try.
export function useApiAction() {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  async function run<T>(request: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    setBusy(true);
    setFailure(null);
    const result = await request();
    setBusy(false);
    if (!result.ok) setFailure(result);
    return result;
  }

  return { busy, failure, clear: () => setFailure(null), run };
}

// The message to show beside a row when the failure names no field (for example a 409 on removing a slot).
export function rowMessage(failure: ApiFailure | null): string | undefined {
  return failure && Object.keys(failure.fields).length === 0 ? failure.message : undefined;
}
