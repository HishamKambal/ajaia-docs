import TurndownService from "turndown";

// Export: stored editor HTML → Markdown (or a standalone HTML file).
export type ExportFormat = "md" | "html";

export function htmlToMarkdown(html: string): string {
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  // Turndown has no underline syntax; keep it as inline HTML, which Markdown allows.
  td.addRule("underline", { filter: ["u"], replacement: (content) => `<u>${content}</u>` });
  return td.turndown(html).trim() + "\n";
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toStandaloneHtml(title: string, html: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6}</style>
</head><body>
${html}
</body></html>
`;
}

export function exportFilename(title: string, format: ExportFormat): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80) || "document";
  return `${base}.${format}`;
}
