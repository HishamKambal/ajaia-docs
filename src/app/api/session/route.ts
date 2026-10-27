import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db";
import { getUser } from "@/server/documents";
import { badRequest } from "@/server/errors";
import { handle, parseJson } from "@/server/route";
import { SESSION_COOKIE, getCurrentUser } from "@/server/session";

export const GET = handle(async () => {
  return NextResponse.json({ user: await getCurrentUser() });
});

const SignInBody = z.object({ userId: z.string().min(1, "userId is required") });

export const POST = handle(async (req: Request) => {
  const { userId } = await parseJson(req, SignInBody);
  const user = await getUser(await getDb(), userId);
  if (!user) throw badRequest("Unknown user");
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
});

export const DELETE = handle(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
