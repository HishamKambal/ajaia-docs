import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db";
import { MAX_TITLE_LENGTH, deleteDocument, getDocument, updateDocument } from "@/server/documents";
import { handle, parseJson } from "@/server/route";
import { requireUser } from "@/server/session";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ document: await getDocument(await getDb(), id, user.id) });
});

const PatchBody = z.object({
  title: z.string().max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`).optional(),
  content: z.string().optional(),
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const patch = await parseJson(req, PatchBody);
  return NextResponse.json({ document: await updateDocument(await getDb(), id, user.id, patch) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteDocument(await getDb(), id, user.id);
  return NextResponse.json({ ok: true });
});
