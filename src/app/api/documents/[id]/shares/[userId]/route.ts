import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { revokeShare } from "@/server/documents";
import { handle } from "@/server/route";
import { requireUser } from "@/server/session";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, userId } = await params;
  return NextResponse.json({ shares: await revokeShare(await getDb(), id, user.id, userId) });
});
