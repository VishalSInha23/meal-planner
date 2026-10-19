export type TargetStatus = "under" | "over" | "on_target";

export interface TargetResult {
  status: TargetStatus;
  // How far the total is from the target, always 0 or more; the status says which side.
  difference: number;
}

export interface NutritionDish {
  date: string;
  kcal: number | null;
  proteinG: number | null;
  // The members ticked for this dish.
  memberIds: string[];
}

export interface NutritionMember {
  id: string;
  kcalTarget: number | null;
  proteinTargetG: number | null;
}

export interface MemberDayNutrition {
  memberId: string;
  date: string;
  kcal: number;
  proteinG: number;
  // Dishes the member is ticked for that have no value; they count as 0.
  dishesWithoutKcal: number;
  dishesWithoutProtein: number;
  // Null when the member has no target.
  kcalStatus: TargetResult | null;
  proteinStatus: TargetResult | null;
}

// Within this share of the target counts as on target.
const ON_TARGET_PERCENT = 5;

// Values are compared in tenths so that decimals add up exactly.
const tenths = (value: number) => Math.round(value * 10);

export function targetStatus(total: number, target: number | null): TargetResult | null {
  if (target === null) return null;
  const difference = tenths(total) - tenths(target);
  const distance = Math.abs(difference);
  // distance / target <= 5 / 100, without division.
  const onTarget = distance * 100 <= ON_TARGET_PERCENT * tenths(target);
  return { status: onTarget ? "on_target" : difference < 0 ? "under" : "over", difference: distance / 10 };
}

// One entry per member per date: the sums of one serving of every dish the member is ticked for.
export function computeNutrition(dates: string[], members: NutritionMember[], dishes: NutritionDish[]): MemberDayNutrition[] {
  return dates.flatMap((date) => {
    const ofDay = dishes.filter((item) => item.date === date);
    return members.map((person) => {
      const eaten = ofDay.filter((item) => item.memberIds.includes(person.id));
      const kcal = eaten.reduce((sum, item) => sum + (item.kcal ?? 0), 0);
      const proteinTenths = eaten.reduce((sum, item) => sum + tenths(item.proteinG ?? 0), 0);
      const proteinG = proteinTenths / 10;
      return {
        memberId: person.id,
        date,
        kcal,
        proteinG,
        dishesWithoutKcal: eaten.filter((item) => item.kcal === null).length,
        dishesWithoutProtein: eaten.filter((item) => item.proteinG === null).length,
        kcalStatus: targetStatus(kcal, person.kcalTarget),
        proteinStatus: targetStatus(proteinG, person.proteinTargetG),
      };
    });
  });
}
