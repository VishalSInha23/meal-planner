import { HouseholdSettings } from "@/components/household/household-settings";
import { requireMember, requireUser } from "@/lib/auth/session";
import { getHouseholdOverview, getJoinCode } from "@/modules/household/household-service";
import { listPendingRequests } from "@/modules/join-request/join-request-service";
import { getPreferences } from "@/modules/user-preference/user-preference-service";

export default async function HouseholdSettingsPage() {
  const user = await requireUser();
  const member = await requireMember();
  const [overview, { weightUnit, heightUnit }, joinCode, pending] = await Promise.all([
    getHouseholdOverview(member.householdId),
    getPreferences(user.id),
    member.isAdmin ? getJoinCode(member.householdId) : undefined,
    member.isAdmin ? listPendingRequests(member.householdId) : undefined,
  ]);
  const requests = pending?.map(({ id, name, sex, ageYears }) => ({ id, name, sex, ageYears }));
  return (
    <HouseholdSettings
      initial={overview}
      meId={member.id}
      units={{ weightUnit, heightUnit }}
      joinCode={joinCode}
      requests={requests}
    />
  );
}
