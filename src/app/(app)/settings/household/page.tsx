import { HouseholdSettings } from "@/components/household/household-settings";
import { requireMember, requireUser } from "@/lib/auth/session";
import { getHouseholdOverview } from "@/modules/household/household-service";
import { getPreferences } from "@/modules/user-preference/user-preference-service";

export default async function HouseholdSettingsPage() {
  const user = await requireUser();
  const member = await requireMember();
  const [overview, { weightUnit, heightUnit }] = await Promise.all([
    getHouseholdOverview(member.householdId),
    getPreferences(user.id),
  ]);
  return <HouseholdSettings initial={overview} meId={member.id} units={{ weightUnit, heightUnit }} />;
}
