# Submission: Ajaia Docs

**Candidate:** Hisham Mohammed Kambal
**Role:** AI-Native Full Stack Product Engineer, Ajaia LLC

| | |
|---|---|
| **Live app** | https://ajaia-docs-seven-livid.vercel.app |
| **Walkthrough video** | VIDEO_URL_PLACEHOLDER (also in [`VIDEO_URL.txt`](VIDEO_URL.txt)) |

## Demo accounts

Sign-in is mocked: choose a user on the start screen, no password.

| User | Email | Seeded "Welcome to Ajaia Docs" role |
|---|---|---|
| Alice Chen | `alice@ajaia.test` | Owner |
| Bob Rivera | `bob@ajaia.test` | Editor |
| Sara Al-Qahtani | `sara@ajaia.test` | Viewer |

## What's included

| Path | What it is |
|---|---|
| `src/app/api/` | REST route handlers: documents, sharing, import, export, session, users |
| `src/server/` | Backend: access rules, repository, DB adapter + schema + seed, sanitizer, import/export, mocked session |
| `src/server/__tests__/` | Vitest unit and integration tests (real Postgres engine via in-memory PGlite) |
| `src/app/` (pages), `src/components/` | UI: sign-in, document lists, Tiptap editor, share dialog |
| `vitest.config.ts`, `.github/workflows/ci.yml` | Test config and CI (typecheck, lint, tests) |
| `README.md` | Overview, demo accounts, setup, scripts, deployment, upload limits |
| `docs/ARCHITECTURE.md` | Architecture note: priorities, diagram, data model, tradeoffs, security, limitations |
| `docs/AI_WORKFLOW.md` | AI workflow note: tools, speed-ups, changed/rejected output, verification |
| `docs/ai/AGENT_BRIEFS.md` | The scoped briefs given to the parallel AI agents |
| `docs/ai/VERIFICATION_CHECKLIST.md` | Automated and manual verification checklist |
| `docs/VIDEO_SCRIPT.md` | Script used for the walkthrough video |
| `docs/screenshots/` | Screenshots of the live app: owner dashboard, editor, share dialog, editor's "Shared with me" view, viewer read-only mode |
| `samples/` | Import test files: `sample-notes.md`, `sample-plain.txt`, `sample-arabic.md`, `sample-brief.docx` |
| `VIDEO_URL.txt` | Link to the walkthrough video |
| `SUBMISSION.md` | This file |

## What works end to end

- Mocked sign-in as three seeded users, with a user switcher
- Create, rename, edit, autosave (~800 ms debounce, *Saving / Saved / Retry*), reopen; content persists in Postgres
- Rich text: bold, italic, underline, H1-H3, bullet and numbered lists, undo / redo
- Import `.txt`, `.md`, `.docx` (max 5 MB) into a new editable document
- Sharing by email as Viewer or Editor; change role; revoke
- **My documents** vs **Shared with me**, with owner name and role badges
- Server-enforced permissions: owner / editor / viewer; 404 for no access, 403 for insufficient role
- Export to Markdown or HTML (stretch)
- Arabic / English content with automatic per-paragraph direction (RTL-aware)
- Validation and error handling: zod at the API boundary, size limits, sanitized HTML, friendly UI states
- Automated tests and CI

## What's intentionally out of scope

| Not built | Why |
|---|---|
| Real-time co-editing, presence | Needs CRDT (Yjs) plus a websocket server. Too large to do well in the timebox. |
| Conflict resolution | Last write wins. Known limitation; first item below. |
| Real authentication | Mocked so reviewers can switch roles instantly. Isolated in `src/server/session.ts`. |
| Comments, version history | Valuable, but secondary to a solid edit + share loop |
| Attachments, PDF export | Outside the core editing workflow |
| Full Arabic UI translation | Content is RTL-aware; the app chrome is English only |

## What I'd build next with 2-4 more hours

1. **Optimistic concurrency:** send the loaded `updated_at` on save; return 409 on conflict and let the user reload or overwrite.
2. **Real-time collaboration:** Yjs + Hocuspocus with Tiptap's collaboration extension, plus presence cursors.
3. **Version snapshots** with restore.
4. **Real auth:** Auth.js magic link, replacing only `session.ts`.
5. **Playwright e2e** for the full share flow across the three users.

## Run locally (Node 20+)

```bash
npm install
npm run dev     # app on http://localhost:3000
npm test        # test suite (in-memory Postgres, no setup)
```

No database or `.env` needed: local dev uses PGlite in `./.data/pglite` and seeds itself on first boot.
