import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db";
import { MAX_TITLE_LENGTH, createDocument, listDocuments } from "@/server/documents";
import { handle, parseJson } from "@/server/route";
import { requireUser } from "@/server/session";

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocuments(await getDb(), user.id));
});

const CreateBody = z.object({
  title: z.string().max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`).optional(),
  content: z.string().optional(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await parseJson(req, CreateBody);
  const doc = await createDocument(await getDb(), user.id, body);
  return NextResponse.json({ document: doc }, { status: 201 });
});
