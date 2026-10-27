import { inflateRawSync } from "node:zlib";
import { marked } from "marked";
import { HttpError, badRequest } from "./errors";

// File import: converts an uploaded file into editor HTML. The caller then
// creates a new document from it (and the repository sanitizes it).
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
// 4 MB keeps uploads under Vercel's 4.5 MB request-body limit for serverless functions.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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

// A 4 MB .docx can hold gigabytes of highly compressed XML (a "zip bomb").
// Before mammoth sees the file, inflate every entry ourselves with a hard output
// cap. We measure what the data really expands to, rather than trusting the
// sizes declared in the ZIP headers, which an attacker controls.
export const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

const invalidDocx = () => badRequest("Couldn't read that .docx file. Is it a valid Word document?");
const tooLargeDocx = () => badRequest("That .docx expands to more than 50 MB and can't be imported");

export function assertDocxSizeIsSafe(buffer: Buffer): void {
  // End-of-central-directory record: signature 0x06054b50, within the last 64 KB + 22 bytes.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw invalidDocx();

  const declaredEntries = buffer.readUInt16LE(eocd + 10);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  const cdStart = buffer.readUInt32LE(eocd + 16);
  // ZIP64 markers: Word never needs them, and they would let real sizes/offsets hide elsewhere.
  if (declaredEntries === 0xffff || cdSize === 0xffffffff || cdStart === 0xffffffff) throw invalidDocx();
  const cdEnd = cdStart + cdSize;
  // The directory must end exactly at the EOCD. Otherwise JSZip adds an "extra bytes"
  // offset and would read different structures than the ones validated here.
  if (cdEnd !== eocd) throw invalidDocx();

  // Walk every central-directory record by signature (as JSZip does) rather than
  // trusting the declared count, so no entry can be hidden from this check.
  let cd = cdStart;
  let seen = 0;
  let remaining = MAX_DOCX_UNCOMPRESSED_BYTES;
  while (cd + 4 <= cdEnd && buffer.readUInt32LE(cd) === 0x02014b50) {
    if (cd + 46 > cdEnd) throw invalidDocx();
    seen++;
    const method = buffer.readUInt16LE(cd + 10);
    const compressedSize = buffer.readUInt32LE(cd + 20);
    if (compressedSize === 0xffffffff) throw invalidDocx(); // ZIP64
    const local = buffer.readUInt32LE(cd + 42);
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) throw invalidDocx();
    const dataStart = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(dataStart, dataStart + compressedSize);

    let actual: number;
    if (method === 0) {
      actual = data.length; // stored, not compressed
    } else if (method === 8) {
      try {
        // Throws a RangeError as soon as the output would pass `remaining`.
        actual = inflateRawSync(data, { maxOutputLength: Math.max(1, remaining) }).length;
      } catch (err) {
        if (err instanceof RangeError) throw tooLargeDocx();
        throw invalidDocx();
      }
    } else {
      throw invalidDocx(); // .docx only uses stored or deflate
    }
    remaining -= actual;
    if (remaining < 0) throw tooLargeDocx();
    cd += 46 + buffer.readUInt16LE(cd + 28) + buffer.readUInt16LE(cd + 30) + buffer.readUInt16LE(cd + 32);
  }
  // Every byte of the directory must be accounted for, and the count must match what the file declares.
  if (seen !== declaredEntries || cd !== cdEnd) throw invalidDocx();
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
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw badRequest("File is too large (max 4 MB)");

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
