import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { listUsers } from "@/server/documents";
import { handle } from "@/server/route";

// Public on purpose: the mocked sign-in screen lists the seeded accounts.
export const GET = handle(async () => {
  return NextResponse.json({ users: await listUsers(await getDb()) });
});
