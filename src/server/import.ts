import { marked } from "marked";
import { badRequest } from "./errors";

// File import: converts an uploaded file into editor HTML. The caller then
// creates a new document from it (and the repository sanitizes it).
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function textToHtml(text: string): string {
  // Blank lines separate paragraphs; single newlines become line breaks.
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true });
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ buffer });
  return value;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return (dot > 0 ? filename.slice(0, dot) : filename).trim() || "Imported document";
}

export async function fileToHtml(filename: string, buffer: Buffer): Promise<string> {
  if (buffer.byteLength === 0) throw badRequest("The file is empty");
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw badRequest("File is too large (max 5 MB)");

  switch (extensionOf(filename)) {
    case ".txt":
      return textToHtml(buffer.toString("utf8"));
    case ".md":
      return markdownToHtml(buffer.toString("utf8"));
    case ".docx":
      try {
        return await docxToHtml(buffer);
      } catch {
        throw badRequest("Couldn't read that .docx file. Is it a valid Word document?");
      }
    default:
      throw badRequest(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
  }
}
