# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs: create, format, import, share and export rich-text documents, with owner / editor / viewer permissions enforced on the server.

Built by **Hisham Mohammed Kambal** as the take-home for the *AI-Native Full Stack Product Engineer* role at Ajaia LLC.

| | |
|---|---|
| **Live demo** | https://ajaia-docs-sigma-pearl.vercel.app |
| **Repository** | https://github.com/HishamKambal/ajaia-docs |
| **Walkthrough video** | https://github.com/HishamKambal/ajaia-docs/releases/download/v1.0/ajaia-docs-walkthrough.mp4 |
| **Submission index** | [`SUBMISSION.md`](SUBMISSION.md) |
| **Stack** | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind v4, Tiptap v3, Postgres (Neon) / PGlite, Vitest |

## Demo accounts

Sign-in is mocked: pick a user on the start screen. No passwords.

| User | Email | Role on the seeded "Welcome to Ajaia Docs" doc |
|---|---|---|
| Alice Chen | `alice@ajaia.test` | Owner |
| Bob Rivera | `bob@ajaia.test` | Editor |
| Sara Al-Qahtani | `sara@ajaia.test` | Viewer |

## 60-second reviewer walkthrough

1. Open the live URL and continue as **Alice**. Open "Welcome to Ajaia Docs".
2. Type, use bold / headings / lists. Watch the status go *Saving... → Saved*. Reload: the content persists.
3. Back on the home page, **Import** [`samples/sample-notes.md`](samples/sample-notes.md) or [`samples/sample-brief.docx`](samples/sample-brief.docx). A new editable document opens.
4. Click **Share**, add `bob@ajaia.test` as **Editor** and `sara@ajaia.test` as **Viewer**.
5. Switch user to **Bob**: the doc is under **Shared with me** and is editable.
6. Switch user to **Sara**: the same doc is read-only (no toolbar, no rename, no share).
7. Export the document as Markdown or HTML.

## Features

| Area | What you get |
|---|---|
| Documents | Create, rename inline, edit, delete (owner), reopen. Separate **My documents** and **Shared with me** lists with owner name and role badge. |
| Rich text | Bold, italic, underline, H1-H3, bullet and numbered lists, undo / redo (Tiptap v3). |
| Saving | ~800 ms debounced autosave with a *Saving / Saved / Retry* status and an unsaved-changes guard. |
| Import | Upload `.txt`, `.md` or `.docx` (max 4 MB). Each upload becomes a **new** editable document titled after the file. |
| Sharing | Share by email as **Viewer** or **Editor**, change role, revoke. Owner-only. |
| Permissions | Owner: read / edit / rename / delete / share. Editor: read / edit / rename. Viewer: read. Enforced in the server repository on every call. |
| Export | Download as Markdown or standalone HTML. Anyone with read access can export. |
| RTL | Paragraphs use `dir="auto"`: Arabic renders right-to-left, English left-to-right, in the same document. |
| Safety | All stored HTML passes a server-side allow-list sanitizer. zod validation at the API boundary. Size limits on title, content and uploads. |

## Run locally

Requirements: **Node 20+**. Nothing else: no database to install, no `.env` needed.

```bash
npm install
npm run dev
# open http://localhost:3000
```

Locally the app uses **PGlite** (Postgres compiled to WASM) stored in `./.data/pglite`. The schema and demo data are created on first boot, idempotently. Delete `./.data` to reset to the seed state.

Optional environment variables:

| Variable | Effect |
|---|---|
| `DATABASE_URL` | A `postgres://` / `postgresql://` connection string. When set, the app uses real Postgres via `pg` instead of PGlite. |
| `PGLITE_DIR` | Override the local PGlite directory (default `./.data/pglite`). |

> If your shell already exports a `DATABASE_URL` for another project, the app will try to use that database. Unset it (`unset DATABASE_URL`, or `$env:DATABASE_URL=$null` in PowerShell) for the zero-setup PGlite mode.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the Vitest suite (uses in-memory PGlite, no setup) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

CI (GitHub Actions) runs typecheck, lint and tests on every push.

## Deploy to Vercel + Neon

1. Create a free Postgres database on [Neon](https://neon.tech) and copy its connection string (`postgresql://...?sslmode=require`).
2. Push this repo to GitHub and import it in Vercel (framework preset: Next.js, default build settings).
3. In Vercel → Project → Settings → Environment Variables, add `DATABASE_URL` with the Neon connection string.
4. Deploy. On the first request the app creates the tables and seeds the demo users and welcome document. No migration step is needed.
5. Smoke test: sign in as each demo user and open the welcome doc.

`DATABASE_URL` is required on Vercel: the serverless filesystem is ephemeral, so the local PGlite file would not persist there.

## Uploads: supported types and limits

| Type | Conversion | Notes |
|---|---|---|
| `.txt` | Blank lines become paragraphs, single newlines become line breaks; text is HTML-escaped | UTF-8 |
| `.md` | `marked` with GitHub-flavored Markdown | Headings, emphasis, lists, links, code |
| `.docx` | `mammoth` | Headings, bold / italic, lists. Images and complex layout are dropped. |

| Limit | Value |
|---|---|
| Upload size | 4 MB (stays under Vercel's 4.5 MB function body limit) |
| Document content | 1 MB (after sanitizing) |
| Title | 200 characters |

Converted HTML goes through the same sanitizer as editor content, so only supported formatting is kept.

## Project structure

```
src/
  app/
    api/                     Route handlers (thin: auth → validate → repository)
      documents/             GET list, POST create
      documents/[id]/        GET, PATCH (title/content), DELETE
      documents/[id]/shares/ GET list, POST share; [userId]/ DELETE revoke
      documents/[id]/export/ GET ?format=md|html
      import/                POST multipart upload → new document
      session/               Mocked sign-in (httpOnly cookie)
      users/                 Seeded users for the sign-in screen
    ...                      Pages (home, document editor)
  components/                Editor, toolbar, share dialog, document lists
  server/
    access.ts                Pure permission rules (owner / editor / viewer)
    documents.ts             Repository: every function enforces access
    database.ts              SQL adapter (pg or PGlite), schema, seed
    db.ts                    Per-process DB handle
    session.ts               Mocked auth (the only file real auth would change)
    sanitize.ts              HTML allow-list sanitizer
    import.ts / export.ts    File conversion
    route.ts / errors.ts     Error → JSON status mapping, JSON parsing
    __tests__/               Vitest unit + integration tests
samples/                     Files for trying import
docs/                        Architecture, AI workflow, video script
```

## Documentation

| Doc | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | What was prioritized, diagram, data model, decisions and tradeoffs, security model, limitations |
| [`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md) | How AI was used, what was changed or rejected, how output was verified |
| [`docs/ai/AGENT_BRIEFS.md`](docs/ai/AGENT_BRIEFS.md) | The scoped briefs given to the parallel agents |
| [`docs/ai/VERIFICATION_CHECKLIST.md`](docs/ai/VERIFICATION_CHECKLIST.md) | Automated and manual verification checklist |
| [`docs/VIDEO_SCRIPT.md`](docs/VIDEO_SCRIPT.md) | Script for the walkthrough video |
| [`SUBMISSION.md`](SUBMISSION.md) | Exactly what is included in the submission |
