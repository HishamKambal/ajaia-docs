import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { listShares, shareDocument } from "@/server/documents";
import { handle, parseJson } from "@/server/route";
import { requireUser } from "@/server/session";
import { ShareBody } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ shares: await listShares(await getDb(), id, user.id) });
});

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const body = await parseJson(req, ShareBody);
  return NextResponse.json({ shares: await shareDocument(await getDb(), id, user.id, body) });
});
