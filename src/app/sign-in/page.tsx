import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";
import { brand } from "@/config/generated/brand";
import { getUser } from "@/lib/auth/session";

export default async function SignInPage() {
  if (await getUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">{brand.name}</h1>
      <SignInButton />
    </main>
  );
}
