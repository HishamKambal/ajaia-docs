# Agent briefs

After I finished and reviewed the backend contract (schema, access rules, repository, API routes), I ran three Claude Code subagents in parallel. These are summaries of the actual briefs each one received. Each brief gave the agent the goal, the files it owned, the contract it had to build against, and how its work would be checked.

The point of the briefs is scope control: an agent that can only touch its own files, against a frozen contract, cannot quietly change behaviour somewhere else to make its own task easier.

## Shared guardrails (all three agents)

| Guardrail | What it meant in practice |
|---|---|
| **File ownership** | Each agent had an explicit list of files and folders it could create or edit. Everything else was read-only. |
| **Contract freeze** | `src/server/**` and `src/app/api/**` were off-limits. If the API didn't fit a need, the agent had to report it, not change it. |
| **Must pass the gates** | `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` had to pass for the agent's work to be accepted. |
| **Report deviations** | Anything that differed from the brief (a skipped item, an assumption, a contract gap) had to be listed explicitly in the agent's final report. |
| **Lead integrates** | Agents did not decide when work was done. I integrated, re-ran the gates and smoke-tested in the browser. |

## 1. UI agent

**Owns:** `src/app/**` pages and layout (not `src/app/api/**`), `src/components/**`, styles.

Build the whole user-facing app on top of the existing API. That means a mocked sign-in screen listing the seeded users (`GET /api/users`, `POST /api/session`) and a user switcher. It also means a home page with separate **My documents** and **Shared with me** sections, showing owner name and a role badge, plus "New document" and an **Import** control that states the supported types (`.txt`, `.md`, `.docx`) and the 4 MB limit. The editor uses Tiptap v3 with bold, italic, underline, H1-H3, bullet and numbered lists, and undo/redo. It needs ~800 ms debounced autosave with a *Saving / Saved / Retry* status, inline rename, an unsaved-changes guard, `dir="auto"` per paragraph for Arabic/English content, and a read-only mode for viewers (no toolbar, rename or share). The share dialog adds people by email with Viewer/Editor, changes roles and revokes access. Export offers Markdown and HTML. Loading, empty, 401, 404 and network-error states must be friendly, and the layout must work at mobile width. Permission decisions come from the `access` field the API returns; the UI never re-implements the rules.

## 2. Tests + CI agent

**Owns:** `src/server/__tests__/**`, `vitest.config.ts`, `.github/workflows/ci.yml`.

Write a Vitest suite that proves the server behaves as specified. It starts with pure tests of `access.ts` covering every role × action. It adds integration tests against a **real Postgres engine** (in-memory PGlite via `createDatabase("memory://")`, no mocks): the full permission matrix for owner, editor, viewer and stranger; 404 for no access vs 403 for an insufficient role; share upsert (re-share changes the role), revoke, and sharing with the owner or an unknown email; sanitization of scripts and event handlers; a formatting round-trip; and title/content validation and limits. It also covers import (`.txt` escaping and paragraphs, `.md`, `.docx`, empty, oversized and unsupported files) and export (Markdown incl. underline, standalone HTML, safe filenames). Add a GitHub Actions workflow running typecheck, lint and tests on Node 20. If a test exposes a server bug, report it rather than fixing the server.

## 3. Docs agent

**Owns:** `README.md`, `SUBMISSION.md`, `VIDEO_URL.txt`, `docs/**`, `samples/**`.

Write the submission documentation from the actual code in `src/server/` and `src/app/api/`, so that every claim is accurate, and describe the UI and tests from the spec because they were being built at the same time. Deliverables: a README a reviewer can absorb in two minutes, the architecture note, the AI workflow note answering the four required questions with a "changed or rejected" table, these briefs, the verification checklist, `SUBMISSION.md` with an exact list of what's included, the video URL file, a timed walkthrough script, and sample files for import (`.md`, `.txt`, bilingual Arabic/English `.md`, and a `.docx`). No marketing language, and no claims that aren't backed by the code or the build facts. Leave clearly marked placeholders for the live URL, the video URL and integration findings.
