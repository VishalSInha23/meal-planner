"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
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
      <IconButton label="Sign out" loading={loading} onClick={signOut}>
        <LogOut size={20} />
      </IconButton>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
