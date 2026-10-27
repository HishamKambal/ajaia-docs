import sanitizeHtml from "sanitize-html";

// Documents are stored as HTML produced by the editor. Everything written to
// the database passes through this allow-list, so stored content can only
// contain the formatting the editor itself supports — no scripts, styles or
// event handlers, regardless of what a client sends.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"], "*": ["dir"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    b: "strong",
    i: "em",
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

export const MAX_CONTENT_BYTES = 1_000_000;

export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
