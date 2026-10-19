const LB_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function kgToLb(kg: number): number {
  return roundToOneDecimal(kg * LB_PER_KG);
}

export function lbToKg(lb: number): number {
  return roundToOneDecimal(lb / LB_PER_KG);
}

// Rounds to whole inches first, so 11.6 inches becomes the next foot and never "12 inches".
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / INCHES_PER_FOOT), inches: totalInches % INCHES_PER_FOOT };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return roundToOneDecimal((feet * INCHES_PER_FOOT + inches) * CM_PER_INCH);
}
