import { randomUUID } from "node:crypto";
import { can, resolveAccess, type AccessLevel, type DocumentAction, type ShareRole } from "./access";
import type { Database } from "./database";
import { badRequest, forbidden, notFound } from "./errors";
import { MAX_CONTENT_BYTES, sanitizeDocumentHtml } from "./sanitize";

// Repository + domain rules for documents and sharing. Every function takes the
// acting user's id and enforces access itself, so API routes stay thin and a
// route can't forget a permission check.

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
  owner: Pick<User, "id" | "name">;
  access: AccessLevel;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
  createdAt: string;
}

export interface Share {
  user: User;
  role: ShareRole;
}

export const MAX_TITLE_LENGTH = 200;
const DEFAULT_TITLE = "Untitled document";

interface DocRow {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  owner_name: string;
  created_at: Date | string;
  updated_at: Date | string;
  share_role: ShareRole | null;
}

const iso = (d: Date | string) => new Date(d).toISOString();

function normalizeTitle(raw: string | undefined): string {
  const title = (raw ?? "").trim().replace(/\s+/g, " ");
  if (title.length > MAX_TITLE_LENGTH) throw badRequest(`Title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  return title || DEFAULT_TITLE;
}

function normalizeContent(raw: string | undefined): string {
  const html = sanitizeDocumentHtml(raw ?? "");
  if (Buffer.byteLength(html, "utf8") > MAX_CONTENT_BYTES) throw badRequest("Document is too large (max 1 MB)");
  return html;
}

function toDetail(row: DocRow, userId: string): DocumentDetail {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    owner: { id: row.owner_id, name: row.owner_name },
    access: resolveAccess(row.owner_id, userId, row.share_role)!,
  };
}

const SELECT_DOC = `
  SELECT d.id, d.title, d.content, d.owner_id, u.name AS owner_name,
         d.created_at, d.updated_at, s.role AS share_role
  FROM documents d
  JOIN users u ON u.id = d.owner_id
  LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $2
  WHERE d.id = $1`;

/** Loads a document and asserts the user may perform `action` on it. */
async function loadAuthorized(db: Database, docId: string, userId: string, action: DocumentAction): Promise<DocRow> {
  const [row] = await db.query<DocRow>(SELECT_DOC, [docId, userId]);
  const access = row ? resolveAccess(row.owner_id, userId, row.share_role) : null;
  // Users with no access get 404, not 403, so document ids can't be probed.
  if (!row || !access) throw notFound();
  if (!can(access, action)) throw forbidden();
  return row;
}

export async function listUsers(db: Database): Promise<User[]> {
  return db.query<User>("SELECT id, name, email FROM users ORDER BY name");
}

export async function getUser(db: Database, userId: string): Promise<User | null> {
  const [user] = await db.query<User>("SELECT id, name, email FROM users WHERE id = $1", [userId]);
  return user ?? null;
}

export async function listDocuments(
  db: Database,
  userId: string,
): Promise<{ owned: DocumentSummary[]; shared: DocumentSummary[] }> {
  const rows = await db.query<Omit<DocRow, "content" | "created_at">>(
    `SELECT d.id, d.title, d.owner_id, u.name AS owner_name, d.updated_at, s.role AS share_role
     FROM documents d
     JOIN users u ON u.id = d.owner_id
     LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $1
     WHERE d.owner_id = $1 OR s.user_id = $1
     ORDER BY d.updated_at DESC`,
    [userId],
  );
  const summaries = rows.map<DocumentSummary>((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: iso(r.updated_at),
    owner: { id: r.owner_id, name: r.owner_name },
    access: resolveAccess(r.owner_id, userId, r.share_role)!,
  }));
  return {
    owned: summaries.filter((d) => d.access === "owner"),
    shared: summaries.filter((d) => d.access !== "owner"),
  };
}

export async function getDocument(db: Database, docId: string, userId: string): Promise<DocumentDetail> {
  return toDetail(await loadAuthorized(db, docId, userId, "read"), userId);
}

export async function createDocument(
  db: Database,
  userId: string,
  input: { title?: string; content?: string },
): Promise<DocumentDetail> {
  const id = `d_${randomUUID()}`;
  await db.query("INSERT INTO documents (id, owner_id, title, content) VALUES ($1, $2, $3, $4)", [
    id,
    userId,
    normalizeTitle(input.title),
    normalizeContent(input.content),
  ]);
  return getDocument(db, id, userId);
}

export async function updateDocument(
  db: Database,
  docId: string,
  userId: string,
  patch: { title?: string; content?: string },
): Promise<DocumentDetail> {
  if (patch.title === undefined && patch.content === undefined) throw badRequest("Nothing to update");
  if (patch.content !== undefined) await loadAuthorized(db, docId, userId, "edit");
  if (patch.title !== undefined) await loadAuthorized(db, docId, userId, "rename");

  await db.query(
    `UPDATE documents
     SET title = COALESCE($2, title), content = COALESCE($3, content), updated_at = now()
     WHERE id = $1`,
    [
      docId,
      patch.title === undefined ? null : normalizeTitle(patch.title),
      patch.content === undefined ? null : normalizeContent(patch.content),
    ],
  );
  return getDocument(db, docId, userId);
}

export async function deleteDocument(db: Database, docId: string, userId: string): Promise<void> {
  await loadAuthorized(db, docId, userId, "delete");
  await db.query("DELETE FROM documents WHERE id = $1", [docId]);
}

export async function listShares(db: Database, docId: string, userId: string): Promise<Share[]> {
  await loadAuthorized(db, docId, userId, "read");
  const rows = await db.query<User & { role: ShareRole }>(
    `SELECT u.id, u.name, u.email, s.role
     FROM document_shares s JOIN users u ON u.id = s.user_id
     WHERE s.document_id = $1 ORDER BY u.name`,
    [docId],
  );
  return rows.map(({ role, ...user }) => ({ user, role }));
}

/** Grants (or changes) access for the user with `email`. Owner only. */
export async function shareDocument(
  db: Database,
  docId: string,
  userId: string,
  input: { email: string; role: ShareRole },
): Promise<Share[]> {
  const doc = await loadAuthorized(db, docId, userId, "share");
  const email = input.email.trim().toLowerCase();
  const [target] = await db.query<User>("SELECT id, name, email FROM users WHERE lower(email) = $1", [email]);
  if (!target) throw notFound(`User "${email}"`);
  if (target.id === doc.owner_id) throw badRequest("The owner already has full access");

  await db.query(
    `INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [docId, target.id, input.role],
  );
  return listShares(db, docId, userId);
}

export async function revokeShare(db: Database, docId: string, userId: string, targetUserId: string): Promise<Share[]> {
  await loadAuthorized(db, docId, userId, "share");
  await db.query("DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2", [docId, targetUserId]);
  return listShares(db, docId, userId);
}
