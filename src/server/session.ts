import "server-only";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { getUser, type User } from "./documents";
import { unauthorized } from "./errors";

// Mocked auth: the reviewer picks one of the seeded users and we remember the
// choice in an httpOnly cookie. Real auth (OAuth / magic link) would replace
// only this file — everything downstream works off `requireUser()`.
export const SESSION_COOKIE = "ajaia_uid";

export async function getCurrentUser(): Promise<User | null> {
  const uid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  return getUser(await getDb(), uid);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
