import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppearanceSettings } from "@/components/appearance/appearance-settings";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Appearance">
          <AppearanceSettings />
        </Card>
        <Link
          href="/settings/household"
          className="flex items-center justify-between gap-4 rounded-lg border-[1.5px] border-ink p-4 transition-transform duration-100 active:scale-[0.99] active:bg-ink/15 md:p-6 motion-reduce:transition-none"
        >
          <span className="flex flex-col gap-1">
            <span className="text-xl font-semibold">Household</span>
            <span className="text-ink/75">Name, meal slots, shopping trips and members</span>
          </span>
          <ChevronRight size={24} aria-hidden="true" />
        </Link>
        <Card title="Account" actions={<SignOutButton />}>
          <p>
            <span className="font-medium">Email: </span>
            {user.email}
          </p>
        </Card>
      </div>
    </div>
  );
}
