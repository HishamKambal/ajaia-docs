import { getDb } from "@/server/db";
import { getDocument } from "@/server/documents";
import { badRequest } from "@/server/errors";
import { exportFilename, htmlToMarkdown, toStandaloneHtml, type ExportFormat } from "@/server/export";
import { handle } from "@/server/route";
import { requireUser } from "@/server/session";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/documents/:id/export?format=md|html — downloads the document. Anyone with read access may export.
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const format = (new URL(req.url).searchParams.get("format") ?? "md") as ExportFormat;
  if (format !== "md" && format !== "html") throw badRequest("format must be md or html");

  const doc = await getDocument(await getDb(), id, user.id);
  const body = format === "md" ? htmlToMarkdown(doc.content) : toStandaloneHtml(doc.title, doc.content);
  const filename = exportFilename(doc.title, format);

  return new Response(body, {
    headers: {
      "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
});
