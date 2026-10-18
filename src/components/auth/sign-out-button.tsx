"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function signOut() {
    setLoading(true);
    setError(undefined);
    const { error: failure } = await authClient.signOut();
    if (failure) {
      setError("Could not sign out. Try again.");
      setLoading(false);
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button loading={loading} onClick={signOut}>
        Sign out
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
