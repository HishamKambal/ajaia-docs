import { describe, expect, it } from "vitest";
import { exportFilename, htmlToMarkdown, toStandaloneHtml } from "@/server/export";

describe("htmlToMarkdown", () => {
  it("converts headings, bold, italic and lists", () => {
    const md = htmlToMarkdown(
      "<h1>Title</h1><h2>Sub</h2><p><strong>bold</strong> and <em>italic</em></p>" +
        "<ul><li>one</li><li>two</li></ul><ol><li>first</li><li>second</li></ol>",
    );
    expect(md).toContain("# Title");
    expect(md).toContain("## Sub");
    expect(md).toContain("**bold** and _italic_");
    expect(md).toMatch(/^-\s+one$/m);
    expect(md).toMatch(/^-\s+two$/m);
    expect(md).toMatch(/^1\.\s+first$/m);
    expect(md).toMatch(/^2\.\s+second$/m);
    expect(md.endsWith("\n")).toBe(true);
  });

  it("keeps underline as inline <u>", () => {
    expect(htmlToMarkdown("<p><u>under</u> line</p>")).toBe("<u>under</u> line\n");
  });
});

describe("exportFilename", () => {
  it.each<[string, "md" | "html", string]>([
    ["My notes", "md", "My notes.md"],
    ['a/b\\c:d*e?f"g<h>i|j', "html", "abcdefghij.html"],
    ["  spaced  ", "md", "spaced.md"],
    ["///", "md", "document.md"],
    ["", "html", "document.html"],
  ])("%j (%s) -> %j", (title, format, expected) => {
    expect(exportFilename(title, format)).toBe(expected);
  });

  it("truncates long titles to 80 characters", () => {
    expect(exportFilename("x".repeat(300), "md")).toBe(`${"x".repeat(80)}.md`);
  });
});

describe("toStandaloneHtml", () => {
  it("escapes the title and embeds the body as-is", () => {
    const out = toStandaloneHtml("</title><script>alert(1)</script> & co", "<p>Body</p>");
    expect(out).toContain("<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; co</title>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("<p>Body</p>");
    expect(out.startsWith("<!doctype html>")).toBe(true);
    expect(out).toContain('<meta charset="utf-8">');
  });
});
