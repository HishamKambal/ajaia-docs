import { marked } from "marked";
import { HttpError, badRequest } from "./errors";

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

// A 5 MB .docx can declare gigabytes of compressed XML (a "zip bomb"). Read the
// ZIP central directory and reject oversized archives *before* mammoth inflates them.
export const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

export function assertDocxSizeIsSafe(buffer: Buffer): void {
  // End-of-central-directory record: signature 0x06054b50, within the last 64 KB + 22 bytes.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw badRequest("Couldn't read that .docx file. Is it a valid Word document?");

  const entries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw badRequest("Couldn't read that .docx file. Is it a valid Word document?");
    }
    total += buffer.readUInt32LE(offset + 24); // declared uncompressed size
    if (total > MAX_DOCX_UNCOMPRESSED_BYTES) throw badRequest("That .docx expands to more than 50 MB and can't be imported");
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  assertDocxSizeIsSafe(buffer);
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
      } catch (err) {
        if (err instanceof HttpError) throw err;
        throw badRequest("Couldn't read that .docx file. Is it a valid Word document?");
      }
    default:
      throw badRequest(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
  }
}
