"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

export function SignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function signIn() {
    setLoading(true);
    setError(undefined);
    // On success the browser leaves for Google, so the spinner stays until then.
    const { error: failure } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (failure) {
      setError("Could not start sign-in. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button loading={loading} onClick={signIn}>
        Continue with Google
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
