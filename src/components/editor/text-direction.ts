import { Extension } from "@tiptap/react";

// Per-block text direction. Each block gets dir="auto" by default, so the
// browser picks RTL for Arabic paragraphs and LTR for English ones on its own.
// An explicit dir="rtl" / "ltr" from stored or imported HTML is preserved.
export type TextDir = "ltr" | "rtl" | "auto";

const DIRECTIONS: readonly TextDir[] = ["ltr", "rtl", "auto"];

export const TextDirection = Extension.create({
  // Distinct from Tiptap's built-in (opt-in) "textDirection" core extension.
  name: "autoTextDirection",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem", "blockquote"],
        attributes: {
          dir: {
            default: "auto",
            parseHTML: (element) => {
              const dir = element.getAttribute("dir") as TextDir | null;
              return dir && DIRECTIONS.includes(dir) ? dir : "auto";
            },
            renderHTML: (attributes) => ({ dir: attributes.dir ?? "auto" }),
          },
        },
      },
    ];
  },
});
