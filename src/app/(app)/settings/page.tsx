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
