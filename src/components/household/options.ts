import { AGE_BANDS } from "@/modules/member/member-schema";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DAY_OPTIONS = DAY_NAMES.map((label, index) => ({ value: String(index), label }));

export const AGE_BAND_OPTIONS = AGE_BANDS.map((band) => ({ value: band, label: band }));

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// The browser's IANA timezone names, with UTC always present.
export function timezoneNames(): string[] {
  const names = new Set<string>(["UTC"]);
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  for (const name of supported?.("timeZone") ?? []) names.add(name);
  return [...names].sort((a, b) => a.localeCompare(b));
}
