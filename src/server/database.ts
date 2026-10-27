// Thin SQL adapter. Production uses real Postgres (e.g. Neon) via `pg`;
// local dev and tests use PGlite (Postgres compiled to WASM), so there is
// zero setup and the SQL dialect is identical in every environment.

export interface Database {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id);

CREATE TABLE IF NOT EXISTS document_shares (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS document_shares_user_idx ON document_shares(user_id);
`;

export const SEED_USERS = [
  { id: "u_alice", name: "Alice Chen", email: "alice@ajaia.test" },
  { id: "u_bob", name: "Bob Rivera", email: "bob@ajaia.test" },
  { id: "u_sara", name: "Sara Al-Qahtani", email: "sara@ajaia.test" },
] as const;

const WELCOME_DOC_ID = "d_welcome";
const WELCOME_HTML =
  "<h1>Welcome to Ajaia Docs</h1>" +
  "<p>This document is owned by <strong>Alice</strong> and shared with <em>Bob</em> as an editor and <u>Sara</u> as a viewer.</p>" +
  "<h2>Try it</h2>" +
  "<ul><li>Switch users from the top-right menu</li><li>Edit this text and watch it autosave</li><li>Open the Share dialog to change access</li></ul>" +
  "<ol><li>Create a document</li><li>Import a .txt, .md or .docx file</li><li>Share it with a teammate</li></ol>" +
  '<p dir="auto">يدعم المحرر النص العربي من اليمين إلى اليسار تلقائياً.</p>';

async function migrateAndSeed(db: Database): Promise<void> {
  // Run statements one by one: pg's extended protocol rejects multi-statement strings.
  for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.query(stmt);
  }
  for (const u of SEED_USERS) {
    await db.query(
      "INSERT INTO users (id, name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [u.id, u.name, u.email],
    );
  }
  const inserted = await db.query<{ id: string }>(
    "INSERT INTO documents (id, owner_id, title, content) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING RETURNING id",
    [WELCOME_DOC_ID, "u_alice", "Welcome to Ajaia Docs", WELCOME_HTML],
  );
  if (inserted.length > 0) {
    await db.query(
      "INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, 'u_bob', 'editor'), ($1, 'u_sara', 'viewer') ON CONFLICT DO NOTHING",
      [WELCOME_DOC_ID],
    );
  }
}

/**
 * @param url Postgres connection string, `memory://` for an in-memory PGlite
 *            (tests), or undefined for a file-backed PGlite in `.data/`.
 */
export async function createDatabase(url?: string): Promise<Database> {
  let db: Database;

  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    db = {
      async query<T>(sql: string, params: unknown[] = []) {
        const res = await pool.query(sql, params);
        return res.rows as T[];
      },
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    let pg: InstanceType<typeof PGlite>;
    if (url === "memory://") {
      pg = new PGlite();
    } else {
      // PGlite only creates the leaf directory, so make sure its parents exist on a fresh checkout.
      const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
      const { mkdirSync } = await import("node:fs");
      mkdirSync(dir, { recursive: true });
      pg = new PGlite(dir);
    }
    await pg.waitReady;
    db = {
      async query<T>(sql: string, params: unknown[] = []) {
        const res = await pg.query<T>(sql, params);
        return res.rows;
      },
    };
  }

  await migrateAndSeed(db);
  return db;
}
