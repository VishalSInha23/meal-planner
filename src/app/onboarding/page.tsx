import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { BrandMark } from "@/components/app-shell/brand-link";
import { toRequestView } from "@/components/join/join-helpers";
import { requireUser } from "@/lib/auth/session";
import { getMyJoinRequest } from "@/modules/join-request/join-request-service";
import { findCurrentMember } from "@/modules/member/member-service";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await findCurrentMember(user.id)) redirect("/plan");
  const request = await getMyJoinRequest(user.id);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <BrandMark />
      <OnboardingForm
        userName={user.name}
        joinRequest={toRequestView(request)}
        requestYou={request && { name: request.name, sex: request.sex, dateOfBirth: request.dateOfBirth }}
      />
    </main>
  );
}
