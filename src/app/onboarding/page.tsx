import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { brand } from "@/config/generated/brand";
import { requireUser } from "@/lib/auth/session";
import { findCurrentMember } from "@/modules/member/member-service";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await findCurrentMember(user.id)) redirect("/plan");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <p className="text-xl font-semibold">{brand.name}</p>
      <OnboardingForm userName={user.name} />
    </main>
  );
}
