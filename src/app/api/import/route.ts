import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { createDocument } from "@/server/documents";
import { badRequest } from "@/server/errors";
import { fileToHtml, titleFromFilename } from "@/server/import";
import { handle } from "@/server/route";
import { requireUser } from "@/server/session";

// Upload a .txt / .md / .docx file and turn it into a new editable document.
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => {
    throw badRequest("Expected a multipart form upload");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Attach a file in the `file` field");

  const html = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(await getDb(), user.id, {
    title: titleFromFilename(file.name).slice(0, 200),
    content: html,
  });
  return NextResponse.json({ document: doc }, { status: 201 });
});
