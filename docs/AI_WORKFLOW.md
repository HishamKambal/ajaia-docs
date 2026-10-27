# AI workflow note

I used AI as a fast pair-programmer and as a way to run independent work in parallel, but I kept the decisions that define correctness (the data model, the permission rules, the API contract) under my own review. Below are direct answers to the four questions in the brief.

## 1. Which AI tools I used

- **Claude Code with Claude Opus 5.5** in the Claude desktop app, under my own Claude account, as the lead session and pair-programmer.
- **Three Claude Code subagents (Opus 5.5)**, delegated from the lead session and run in parallel, each with a tightly scoped brief (see [`docs/ai/AGENT_BRIEFS.md`](ai/AGENT_BRIEFS.md)).
- **Claude Code's security-review plugin**, which reviews every commit automatically. It flagged the zip-bomb issue below.
- **Vercel CLI**, driven from the same session: it provisioned Neon Postgres and deployed to production, and the built-in browser ran smoke tests of the live app as each demo user.

### How I orchestrated it

1. **Contract first.** In the lead session I wrote the backend contract before anything else: schema, pure access rules, the repository, and the API routes. I reviewed every line of it myself, because everything else depends on it.
2. **Scoped parallel agents.** I then dispatched three subagents at the same time: **UI**, **tests + CI**, and **docs**. Each brief named the files the agent owned and forbade editing the server/API layer. That froze the contract, so agents couldn't drift it to make their own work easier, and they couldn't collide on files.
3. **Human integration gate.** I integrated the results, ran typecheck, lint, tests and the production build, and then smoke-tested every flow in the browser as each of the three users before accepting anything.

## 2. Where AI materially sped up my work

- **Scaffolding** the Next.js app, route handler shapes and config.
- **Editor boilerplate:** the Tiptap toolbar, the editor setup and autosave status wiring.
- **Exhaustive test cases:** the permission matrix (every role × every action, plus 404-vs-403) is tedious to write by hand and easy to get slightly wrong. AI generated it quickly; I checked it against the rules table.
- **Docs drafting:** README, architecture note and checklists, which I then edited for accuracy.
- **Parallelism:** UI, tests and docs were written at the same time instead of one after another, which is where most of the time saving came from.

## 3. What AI output I changed or rejected

| AI suggestion | Problem | What I did instead |
|---|---|---|
| Use a SQLite file for persistence | Vercel's serverless filesystem is ephemeral; data would vanish between invocations | Neon Postgres in production, PGlite (WASM Postgres) locally and in tests: same SQL everywhere, zero local setup |
| Add an ORM (Prisma / Drizzle) | Overkill for ~10 queries; adds codegen, build and migration weight | A ~20-line `Database.query()` adapter that both `pg` and PGlite satisfy |
| Store the client's HTML as-is | Stored XSS: any client could save a `<script>` or `onerror` handler | Server-side allow-list sanitizer on every write, including imports |
| Return 403 for documents the user can't access | Leaks that the document exists, so ids can be probed | 404 when the user has no access; 403 only when they can see it but lack the role |
| Permission checks inside each route | Easy for one route to forget a check | Centralized in the repository (every function authorizes) plus a pure rules module that is unit-tested |
| Run the schema as one multi-statement SQL string | `pg`'s parameterized protocol rejects multi-statement strings. Only PGlite accepted it, so it would have passed locally and broken in production | Split and execute the statements one by one |
| Keep the scaffolded Next.js 15.5.4 | `npm audit` reported a critical advisory | Pinned the patched 15.5.28 |

### What the integration gate caught

The agents' own checks passed, but integrating and testing against the real deployment still found three problems. That's the reason the gate exists.

| Found by | Problem | Fix |
|---|---|---|
| Live `curl` pass against production | Sharing with `" SARA@ajaia.test "` returned 400. The repository normalized emails and its tests passed, but the API's zod schema rejected the stray whitespace *before* the request reached the repository. Unit tests on one layer couldn't see it. | Trim and lowercase in the schema (`src/server/validation.ts`), plus a regression test |
| UI agent, first run on a clean machine | Local PGlite crashed with `ENOENT` because `.data/` didn't exist yet. My tests use in-memory mode, so they never exercised the file path. | `mkdirSync(dir, { recursive: true })` before opening PGlite |
| Automated security review on commit (Claude Code security plugin) | A small `.docx` can hold gigabytes of compressed XML, a "zip bomb" that mammoth would inflate in memory. The upload limit only capped the *compressed* size. Two further review passes caught that my first fixes still trusted attacker-controlled ZIP headers: the declared sizes, then the declared entry count. | Walk every central-directory record by signature (count must match, no ZIP64) and inflate each with `zlib` under a hard `maxOutputLength`, measuring real output, before mammoth sees the file; fail closed on a malformed `Content-Length`; lowered uploads to 4 MB to sit under Vercel's 4.5 MB body limit; regression test with a generated bomb |
| UI agent | A `DATABASE_URL` left in my shell from another project made the app try a foreign Postgres. | Documented in the README: unset it for zero-setup local runs |

## 4. How I verified correctness, UX and reliability

- **Automated gates:** typecheck, lint, the Vitest suite and the production build must all pass. CI runs typecheck, lint and tests on every push.
- **Tests against a real engine:** the integration tests run on in-memory PGlite (real Postgres), not mocks. They cover the permission matrix, 404 vs 403, share upsert and revoke, sanitization, formatting round-trip, validation, and import / export.
- **API exercised with curl**, including the negative cases: no session (401), no access (404), insufficient role (403), and invalid input or uploads (400).
- **Manual browser pass as all three users:** Alice (owner), Bob (editor) and Sara (viewer). I checked import of each file type, export, Arabic RTL rendering, and the layout at mobile width.
- **Reading every diff:** I read every AI-written diff before accepting it. Most of the corrections in the table above came from that review, or from asking how a choice would behave on Vercel rather than on my laptop.

The full checklist is in [`docs/ai/VERIFICATION_CHECKLIST.md`](ai/VERIFICATION_CHECKLIST.md).
