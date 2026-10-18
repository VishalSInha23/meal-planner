import { getAppConfig } from "@/lib/config";

export const THEME_COOKIE = "theme";
export const FONT_COOKIE = "font";

// The cookies let the sign-in page and a fresh device look right before anyone is signed in.
export function preferenceCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: getAppConfig().baseUrl.startsWith("https://"),
  };
}
