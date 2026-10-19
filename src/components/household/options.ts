import { AGE_BANDS } from "@/modules/member/member-schema";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DAY_OPTIONS = DAY_NAMES.map((label, index) => ({ value: String(index), label }));

export const AGE_BAND_OPTIONS = AGE_BANDS.map((band) => ({ value: band, label: band }));

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
