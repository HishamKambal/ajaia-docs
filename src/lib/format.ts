// Small client-side formatting helpers and limits mirrored from the server
// (the server modules pull in Node APIs, so values can't be imported here).

export const MAX_TITLE_LENGTH = 200;
export const IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

export function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

export function validateImportFile(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!(IMPORT_EXTENSIONS as readonly string[]).includes(ext)) return "Unsupported file type. Use .txt, .md or .docx.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_IMPORT_BYTES) return "File is too large (max 4 MB).";
  return null;
}
