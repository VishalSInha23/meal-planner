import { HouseholdSettings } from "@/components/household/household-settings";
import { requireMember } from "@/lib/auth/session";
import { getHouseholdOverview } from "@/modules/household/household-service";

export default async function HouseholdSettingsPage() {
  const member = await requireMember();
  const overview = await getHouseholdOverview(member.householdId);
  return <HouseholdSettings initial={overview} meId={member.id} />;
}
