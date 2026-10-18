import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminOnly, noHousehold, unauthorized } from "@/lib/http/errors";
import { getRequestContext, setLogUser } from "@/lib/log/request-context";
import { findCurrentMember, type CurrentMember } from "@/modules/member/member-service";
import { getAuth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

// Cached per render, so a layout and a page asking for the user cost one lookup.
const readSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Reading the headers first makes the page dynamic, so a build never needs the auth secrets.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return session?.user ?? null;
});

export async function getUser(): Promise<SessionUser | null> {
  const user = await readSessionUser();
  if (user) setLogUser(user.id);
  return user;
}

// Pages (no request context) redirect to the sign-in page. Route handlers throw a 401.
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (user) return user;
  if (getRequestContext()) throw unauthorized();
  redirect("/sign-in");
}

// The signed-in user's member with its household. Pages without a household go to onboarding;
// route handlers answer 403 no_household. The household id always comes from here.
export async function requireMember(): Promise<CurrentMember> {
  const user = await requireUser();
  const member = await findCurrentMember(user.id);
  if (member) return member;
  if (getRequestContext()) throw noHousehold();
  redirect("/onboarding");
}

export async function requireAdmin(): Promise<CurrentMember> {
  const member = await requireMember();
  if (!member.isAdmin) throw adminOnly();
  return member;
}
