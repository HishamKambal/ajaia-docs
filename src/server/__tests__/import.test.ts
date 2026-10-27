import { randomBytes } from "node:crypto";
// jszip comes in transitively via mammoth. It only has a default export (the JSZip class).
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { HttpError } from "@/server/errors";
import { fileToHtml, MAX_UPLOAD_BYTES, titleFromFilename } from "@/server/import";

const buf = (s: string) => Buffer.from(s, "utf8");

async function expectBadRequest(promise: Promise<unknown>): Promise<HttpError> {
  const err = await promise.then(
    () => {
      throw new Error("Expected HttpError 400, but the call succeeded");
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(400);
  return err as HttpError;
}

/** Builds a minimal valid .docx: a plain paragraph and a bold one. */
async function makeDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello from Word</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold text</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("fileToHtml: .txt", () => {
  it("splits blank-line separated blocks into paragraphs", async () => {
    expect(await fileToHtml("a.txt", buf("First para\n\nSecond para"))).toBe("<p>First para</p><p>Second para</p>");
  });

  it("escapes HTML so markup stays literal text", async () => {
    expect(await fileToHtml("a.txt", buf('<b>x</b> & "q"'))).toBe("<p>&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot;</p>");
  });

  it("turns single newlines (including CRLF) into <br>", async () => {
    expect(await fileToHtml("a.txt", buf("line 1\r\nline 2\nline 3"))).toBe("<p>line 1<br>line 2<br>line 3</p>");
  });
});

describe("fileToHtml: .md", () => {
  it("converts headings, lists and bold", async () => {
    const html = await fileToHtml("notes.md", buf("# Title\n\n## Sub\n\n- one\n- **two**\n\n1. a\n2. b\n"));
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<h2>Sub</h2>");
    expect(html).toMatch(/<ul>\s*<li>one<\/li>\s*<li><strong>two<\/strong><\/li>\s*<\/ul>/);
    expect(html).toMatch(/<ol>\s*<li>a<\/li>\s*<li>b<\/li>\s*<\/ol>/);
  });

  it("accepts an uppercase extension", async () => {
    expect(await fileToHtml("README.MD", buf("# Hi"))).toContain("<h1>Hi</h1>");
  });
});

describe("fileToHtml: .docx", () => {
  it("converts a real (generated) .docx", async () => {
    const html = await fileToHtml("report.docx", await makeDocx());
    expect(html).toContain("<p>Hello from Word</p>");
    expect(html).toContain("<strong>Bold text</strong>");
  });

  it("rejects an invalid .docx with a friendly 400", async () => {
    const err = await expectBadRequest(fileToHtml("broken.docx", randomBytes(2048)));
    expect(err.message).toMatch(/valid Word document/);
  });

  it("rejects a zip bomb before inflating it", async () => {
    // ~51 MB of zeros deflates to well under the 4 MB upload limit.
    const zip = new JSZip();
    zip.file("word/document.xml", Buffer.alloc(51 * 1024 * 1024));
    const bomb = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    expect(bomb.byteLength).toBeLessThan(MAX_UPLOAD_BYTES);

    const err = await expectBadRequest(fileToHtml("bomb.docx", bomb));
    expect(err.message).toMatch(/more than 50 MB/);
  });

  it("still rejects a zip bomb whose headers lie about its size", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", Buffer.alloc(51 * 1024 * 1024));
    const bomb = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    // Rewrite the declared uncompressed size (central directory and local header) to 100 bytes.
    const cd = bomb.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bomb.writeUInt32LE(100, cd + 24);
    bomb.writeUInt32LE(100, 22);

    const err = await expectBadRequest(fileToHtml("liar.docx", bomb));
    expect(err.message).toMatch(/more than 50 MB/);
  });

  it("rejects an archive whose declared entry count hides entries", async () => {
    const docx = await makeDocx();
    const eocd = docx.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    docx.writeUInt16LE(1, eocd + 8); // entries on this disk
    docx.writeUInt16LE(1, eocd + 10); // total entries: claim just one

    const err = await expectBadRequest(fileToHtml("hidden.docx", docx));
    expect(err.message).toMatch(/valid Word document/);
  });
});

describe("fileToHtml: rejections", () => {
  it("rejects unsupported extensions and lists the supported ones", async () => {
    const err = await expectBadRequest(fileToHtml("image.png", buf("data")));
    expect(err.message).toContain(".txt, .md, .docx");
  });

  it("rejects a file with no extension", async () => {
    await expectBadRequest(fileToHtml("Makefile", buf("all:")));
  });

  it("rejects an empty file", async () => {
    const err = await expectBadRequest(fileToHtml("empty.txt", Buffer.alloc(0)));
    expect(err.message).toMatch(/empty/);
  });

  it("rejects a file over 4 MB but accepts exactly 4 MB", async () => {
    const err = await expectBadRequest(fileToHtml("big.txt", Buffer.alloc(MAX_UPLOAD_BYTES + 1, "a")));
    expect(err.message).toMatch(/too large/);
    await expect(fileToHtml("max.txt", Buffer.alloc(MAX_UPLOAD_BYTES, "a"))).resolves.toMatch(/^<p>a+<\/p>$/);
  });
});

describe("titleFromFilename", () => {
  it.each([
    ["Quarterly report.docx", "Quarterly report"],
    ["archive.tar.md", "archive.tar"],
    ["noext", "noext"],
    [".md", ".md"],
    ["  spaced .txt", "spaced"],
    [" .txt", "Imported document"],
  ])("%j -> %j", (input, expected) => {
    expect(titleFromFilename(input)).toBe(expected);
  });
});
