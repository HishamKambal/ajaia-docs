import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "@/server/database";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  listShares,
  revokeShare,
  shareDocument,
  updateDocument,
} from "@/server/documents";
import { HttpError } from "@/server/errors";

const ALICE = "u_alice";
const BOB = "u_bob";
const SARA = "u_sara";

/** Asserts that `promise` rejects with an HttpError carrying `status`. */
async function expectStatus(promise: Promise<unknown>, status: number): Promise<HttpError> {
  const err = await promise.then(
    () => {
      throw new Error(`Expected HttpError ${status}, but the call succeeded`);
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(status);
  return err as HttpError;
}

// One migrated, seeded in-memory Postgres per file (booting PGlite costs ~1.5s).
// Before each test, drop everything the tests create and restore the seeded
// welcome-doc shares, so every test starts from the exact seed state.
let db: Database;
beforeAll(async () => {
  db = await createDatabase("memory://");
});
beforeEach(async () => {
  await db.query("DELETE FROM documents WHERE id <> 'd_welcome'");
  await db.query("DELETE FROM document_shares WHERE document_id = 'd_welcome'");
  await db.query(
    "INSERT INTO document_shares (document_id, user_id, role) VALUES ('d_welcome', 'u_bob', 'editor'), ('d_welcome', 'u_sara', 'viewer')",
  );
});

describe("create and list", () => {
  it("lists a new document under `owned` for its creator and nowhere for others", async () => {
    const doc = await createDocument(db, ALICE, { title: "Plan", content: "<p>Hi</p>" });
    expect(doc.access).toBe("owner");
    expect(doc.owner).toEqual({ id: ALICE, name: "Alice Chen" });

    const alice = await listDocuments(db, ALICE);
    expect(alice.owned.map((d) => d.id)).toContain(doc.id);
    expect(alice.shared.map((d) => d.id)).not.toContain(doc.id);

    for (const other of [BOB, SARA]) {
      const list = await listDocuments(db, other);
      expect([...list.owned, ...list.shared].map((d) => d.id)).not.toContain(doc.id);
    }
  });

  it("sees the seeded welcome doc with the right access per user", async () => {
    expect((await listDocuments(db, ALICE)).owned.map((d) => d.id)).toContain("d_welcome");
    expect((await listDocuments(db, BOB)).shared.find((d) => d.id === "d_welcome")?.access).toBe("editor");
    expect((await listDocuments(db, SARA)).shared.find((d) => d.id === "d_welcome")?.access).toBe("viewer");
  });
});

describe("sharing and permissions", () => {
  it("shows a doc shared with bob as viewer in bob's `shared` list", async () => {
    const doc = await createDocument(db, ALICE, { title: "Shared" });
    const shares = await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "viewer" });
    expect(shares).toEqual([{ user: { id: BOB, name: "Bob Rivera", email: "bob@ajaia.test" }, role: "viewer" }]);

    const bob = await listDocuments(db, BOB);
    const entry = bob.shared.find((d) => d.id === doc.id);
    expect(entry?.access).toBe("viewer");
    expect(bob.owned.map((d) => d.id)).not.toContain(doc.id);
  });

  it("lets a viewer read but not edit content or rename (403)", async () => {
    const doc = await createDocument(db, ALICE, { title: "T", content: "<p>original</p>" });
    await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "viewer" });

    const read = await getDocument(db, doc.id, BOB);
    expect(read.content).toBe("<p>original</p>");
    expect(read.access).toBe("viewer");

    await expectStatus(updateDocument(db, doc.id, BOB, { content: "<p>hacked</p>" }), 403);
    await expectStatus(updateDocument(db, doc.id, BOB, { title: "hacked" }), 403);
    expect((await getDocument(db, doc.id, ALICE)).content).toBe("<p>original</p>");
  });

  it("lets an editor edit and rename but not share or delete (403)", async () => {
    const doc = await createDocument(db, ALICE, { title: "T" });
    await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "editor" });

    const edited = await updateDocument(db, doc.id, BOB, { title: "Renamed", content: "<p>by bob</p>" });
    expect(edited.title).toBe("Renamed");
    expect(edited.content).toBe("<p>by bob</p>");
    expect(edited.access).toBe("editor");

    await expectStatus(shareDocument(db, doc.id, BOB, { email: "sara@ajaia.test", role: "viewer" }), 403);
    await expectStatus(revokeShare(db, doc.id, BOB, BOB), 403);
    await expectStatus(deleteDocument(db, doc.id, BOB), 403);
    expect((await getDocument(db, doc.id, ALICE)).title).toBe("Renamed");
  });

  it("returns 404 (not 403) to a user with no access", async () => {
    const doc = await createDocument(db, ALICE, { title: "Private" });

    await expectStatus(getDocument(db, doc.id, SARA), 404);
    await expectStatus(updateDocument(db, doc.id, SARA, { content: "<p>x</p>" }), 404);
    await expectStatus(updateDocument(db, doc.id, SARA, { title: "x" }), 404);
    await expectStatus(listShares(db, doc.id, SARA), 404);
    await expectStatus(shareDocument(db, doc.id, SARA, { email: "bob@ajaia.test", role: "editor" }), 404);
    await expectStatus(revokeShare(db, doc.id, SARA, BOB), 404);
    await expectStatus(deleteDocument(db, doc.id, SARA), 404);
  });

  it("returns 404 for a document id that does not exist", async () => {
    await expectStatus(getDocument(db, "d_missing", ALICE), 404);
  });

  it("rejects sharing with an unknown email (404)", async () => {
    const doc = await createDocument(db, ALICE, {});
    await expectStatus(shareDocument(db, doc.id, ALICE, { email: "nobody@ajaia.test", role: "viewer" }), 404);
  });

  it("rejects sharing with the owner's own email (400)", async () => {
    const doc = await createDocument(db, ALICE, {});
    await expectStatus(shareDocument(db, doc.id, ALICE, { email: "alice@ajaia.test", role: "editor" }), 400);
  });

  it("matches emails case-insensitively and ignores surrounding whitespace", async () => {
    const doc = await createDocument(db, ALICE, {});
    const shares = await shareDocument(db, doc.id, ALICE, { email: "  BOB@Ajaia.Test ", role: "viewer" });
    expect(shares.map((s) => s.user.id)).toEqual([BOB]);
  });

  it("changes the role when re-sharing, without creating a duplicate", async () => {
    const doc = await createDocument(db, ALICE, {});
    await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "viewer" });
    const shares = await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "editor" });

    expect(shares).toHaveLength(1);
    expect(shares[0]).toMatchObject({ user: { id: BOB }, role: "editor" });
    expect((await getDocument(db, doc.id, BOB)).access).toBe("editor");
  });

  it("revoking a share removes access (the user then gets 404)", async () => {
    const doc = await createDocument(db, ALICE, {});
    await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "editor" });
    await getDocument(db, doc.id, BOB);

    const shares = await revokeShare(db, doc.id, ALICE, BOB);
    expect(shares).toEqual([]);
    await expectStatus(getDocument(db, doc.id, BOB), 404);
    const bob = await listDocuments(db, BOB);
    expect(bob.shared.map((d) => d.id)).not.toContain(doc.id);
  });

  it("lets a viewer list shares (read access)", async () => {
    const shares = await listShares(db, "d_welcome", SARA);
    expect(shares.map((s) => [s.user.id, s.role])).toEqual([
      [BOB, "editor"],
      [SARA, "viewer"],
    ]);
  });
});

describe("content persistence and sanitization", () => {
  it("round-trips formatted content unchanged", async () => {
    const html =
      "<h1>Heading</h1>" +
      "<p><strong>bold</strong> <em>italic</em> <u>underline</u></p>" +
      "<ul><li>one</li><li>two</li></ul>" +
      "<ol><li>first</li><li>second</li></ol>";

    const created = await createDocument(db, ALICE, { title: "Fmt", content: html });
    expect(created.content).toBe(html);
    expect((await getDocument(db, created.id, ALICE)).content).toBe(html);

    const html2 = html.replace("Heading", "Updated");
    await updateDocument(db, created.id, ALICE, { content: html2 });
    expect((await getDocument(db, created.id, ALICE)).content).toBe(html2);
  });

  it("strips <script>, event handlers and style attributes on create", async () => {
    const doc = await createDocument(db, ALICE, {
      content: '<p onclick="alert(1)" style="color:red">safe</p><script>alert(1)</script>',
    });
    expect(doc.content).toBe("<p>safe</p>");
  });

  it("strips <script>, event handlers and style attributes on update", async () => {
    const doc = await createDocument(db, ALICE, {});
    const updated = await updateDocument(db, doc.id, ALICE, {
      content: '<h2 style="x" onclick="steal()">Hi</h2><script>document.cookie</script><img src=x onerror=alert(1)>',
    });
    expect(updated.content).toBe("<h2>Hi</h2>");
    expect((await getDocument(db, doc.id, ALICE)).content).toBe("<h2>Hi</h2>");
  });
});

describe("validation", () => {
  it("defaults a blank title to 'Untitled document'", async () => {
    expect((await createDocument(db, ALICE, { title: "   " })).title).toBe("Untitled document");
    expect((await createDocument(db, ALICE, {})).title).toBe("Untitled document");
  });

  it("rejects a title over 200 characters (400) on create and rename", async () => {
    await expectStatus(createDocument(db, ALICE, { title: "x".repeat(201) }), 400);
    const ok = await createDocument(db, ALICE, { title: "x".repeat(200) });
    expect(ok.title).toHaveLength(200);
    await expectStatus(updateDocument(db, ok.id, ALICE, { title: "y".repeat(201) }), 400);
  });

  it("rejects an empty patch (400)", async () => {
    const doc = await createDocument(db, ALICE, {});
    await expectStatus(updateDocument(db, doc.id, ALICE, {}), 400);
  });
});

describe("isolation", () => {
  // Guards the shared-DB reset in beforeEach: a fresh database must look identical.
  it("starts each test from the seed state", async () => {
    const fresh = await createDatabase("memory://");
    for (const user of [ALICE, BOB, SARA]) {
      const strip = (l: Awaited<ReturnType<typeof listDocuments>>) => ({
        owned: l.owned.map(({ id, access }) => ({ id, access })),
        shared: l.shared.map(({ id, access }) => ({ id, access })),
      });
      expect(strip(await listDocuments(db, user))).toEqual(strip(await listDocuments(fresh, user)));
    }
    expect(await listShares(db, "d_welcome", ALICE)).toEqual(await listShares(fresh, "d_welcome", ALICE));
  });
});

describe("delete", () => {
  it("deletes the document and cascades its shares", async () => {
    const doc = await createDocument(db, ALICE, {});
    await shareDocument(db, doc.id, ALICE, { email: "bob@ajaia.test", role: "editor" });
    await shareDocument(db, doc.id, ALICE, { email: "sara@ajaia.test", role: "viewer" });

    await deleteDocument(db, doc.id, ALICE);

    await expectStatus(getDocument(db, doc.id, ALICE), 404);
    const rows = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM document_shares WHERE document_id = $1",
      [doc.id],
    );
    expect(rows[0].n).toBe(0);
    expect((await listDocuments(db, BOB)).shared.map((d) => d.id)).not.toContain(doc.id);
  });
});
