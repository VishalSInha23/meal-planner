import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await requireUser();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <p>Signed in as {user.email}</p>
      <SignOutButton />
    </main>
  );
}
