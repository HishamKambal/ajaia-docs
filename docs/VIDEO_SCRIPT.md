# Walkthrough video script (about 4 minutes)

Target length: 4:00 (hard limit 5:00). Each section lists what to **show** and what to **say**. The spoken lines are a guide; say them in your own words rather than reading them.

## Pre-recording checklist

**Seed state**
- [ ] Live site is close to the seed state: sign in as each user and delete leftover test documents with the trash icon, so only "Welcome to Ajaia Docs" remains (it is re-seeded automatically if removed). To record locally instead, delete `./.data` and restart `npm run dev`.
- [ ] Not signed in (clear the `ajaia_uid` cookie, or use a fresh incognito window).

**Tabs and windows to open**
1. Live app (https://ajaia-docs-sigma-pearl.vercel.app) on the sign-in screen
2. Code editor with `src/server/access.ts` and `src/server/documents.ts` open (the `loadAuthorized` function visible)
3. `docs/AI_WORKFLOW.md` (the "Changed or rejected" table) and `docs/ai/AGENT_BRIEFS.md`
4. A terminal in the project folder, ready to run `npm test`

**Sample files ready** (in `samples/`, in a file-picker-friendly folder)
- `sample-notes.md`, `sample-brief.docx`, `sample-arabic.md`
- Optional: copy one Arabic sentence to the clipboard, e.g. `هذا المستند يدعم الكتابة من اليمين إلى اليسار.`

**Setup**
- [ ] Browser zoom at 110-125% so text is readable; close unrelated tabs and notifications
- [ ] Screen recorder at 1080p, microphone checked
- [ ] Run `npm test` once beforehand so the second run is fast

---

## 0:00 - 0:20 Intro and scope decision

**Show:** The sign-in screen with the three users.

**Say:** "Hi, I'm Hisham. This is Ajaia Docs, a lightweight document editor inspired by Google Docs. With a four-to-six-hour budget, I made one big scope call up front: I built a complete, trustworthy loop of create, edit, share and permissions, and I deliberately skipped real-time co-editing. I'll come back to why."

## 0:20 - 1:05 Main flow as Alice

**Show:** Continue as Alice. Point out **My documents** and **Shared with me**. Click **New document**. Rename it inline to "Launch plan". Type a heading (H1), a sentence with **bold**, *italic* and underline, then a bullet list and a numbered list. Point at the *Saving... → Saved* indicator. Reload the page.

**Say:** "I'm signed in as Alice. Owned and shared documents are kept separate, so it's always clear what's yours. I'll create a document and rename it inline. The editor is Tiptap with headings, bold, italic, underline and both kinds of lists. There's no save button: it autosaves about 800 milliseconds after I stop typing, and the status tells me when it's saved, or offers a retry if the network fails. If I reload, everything's still there, because it's stored in Postgres."

## 1:05 - 1:30 Import

**Show:** Back to the home page. **Import** `sample-notes.md`; the new doc opens. Back again, import `sample-brief.docx`. Point at the supported types and 4 MB limit shown next to the button.

**Say:** "Uploads come into the workflow as new, editable documents. Markdown keeps its headings and lists, and Word files work too. The supported types and the size limit are stated right in the UI, and anything unsupported gets a clear error instead of a silent failure."

## 1:30 - 2:00 Share with Bob and Sara

**Show:** In the imported doc, open **Share**. Add `bob@ajaia.test` as **Editor**, `sara@ajaia.test` as **Viewer**. Show the list with both entries and the role dropdown.

**Say:** "Now I'll share this. Bob gets edit access and Sara gets view-only. As the owner I can change a role or revoke access at any time. Everyone else sees this list read-only; only the owner can change it."

## 2:00 - 2:30 Switch to Bob, then Sara

**Show:** Switch user to **Bob**. Open **Shared with me**: the doc shows Alice as owner and an Editor badge. Type a line; it saves. Switch to **Sara**. Open the same doc: "View only" banner, no toolbar, not editable. Click **Share** to show the access list is read-only for her.

**Say:** "Switching to Bob: the document is under Shared with me, with the owner and his role. He can edit, and it saves. Now Sara: same document, but read-only. The important part is that this isn't just hidden buttons. The server enforces it. If Sara calls the API directly she gets a 403."

## 2:30 - 2:50 Export and Arabic RTL

**Show:** As Sara, click **Export → Markdown**, open the downloaded file briefly. Switch back to Alice, open her document, paste an Arabic sentence as a new paragraph under an English one.

**Say:** "Anyone who can read a document can export it to Markdown or HTML. One extra I care about: I build bilingual products, so each paragraph picks its own direction. Arabic flows right to left, and English stays left to right, in the same document."

## 2:50 - 3:10 What I deprioritized and why

**Show:** `SUBMISSION.md`, the "intentionally out of scope" table.

**Say:** "What I didn't build: real-time co-editing, comments, version history, and real auth. Real-time editing done properly needs a CRDT and a websocket server. Doing it halfway would have been worse than not doing it. Today it's last-write-wins, which I call out as a known limitation. With two to four more hours, I'd first add a version check that returns a 409 on conflicts, then move to Yjs with Hocuspocus."

## 3:10 - 3:35 Key implementation decisions

**Show:** `src/server/access.ts` (the permissions table), then `loadAuthorized` in `src/server/documents.ts`.

**Say:** "A few decisions that matter. I wrote the backend contract first. The permission rules live in one pure module, and every repository function checks access itself, so no route can forget a check. If you can't see a document you get a 404, not a 403, so nobody can probe document ids. Production runs on Neon Postgres, and locally and in tests I use PGlite, which is Postgres compiled to WebAssembly: same SQL everywhere, nothing to install. Content is stored as HTML, but it goes through a server-side allow-list sanitizer on every write, so stored XSS isn't possible."

## 3:35 - 3:55 How AI supported the workflow

**Show:** `docs/ai/AGENT_BRIEFS.md`, then the "What the integration gate caught" table in `docs/AI_WORKFLOW.md`, then the terminal running `npm test` with the passing summary (77 tests).

**Say:** "I used Claude Code as a pair-programmer. Once the backend contract was done, I ran three agents in parallel, for UI, tests and docs, each with a scoped brief and the API frozen so they couldn't drift it. Every agent reported green, but I don't treat that as done. My own gate found real bugs: sharing failed for an email with a stray space, because the API validation ran before the normalization the unit tests covered. And an automated security review flagged that a small Word file could be a zip bomb. My first fix trusted the zip headers, which an attacker controls, so I iterated until the server measures what the file really decompresses to. Each fix has a regression test. I verified with typecheck, lint, the build, 77 tests on a real Postgres engine, curl against production, and a manual pass as all three users."

## 3:55 - 4:05 Close

**Show:** The app home page as Alice.

**Say:** "That's Ajaia Docs: a small scope, built carefully, with the tradeoffs written down. Everything's in the README and SUBMISSION file. Thanks for watching."

---

## Recording tips

- Do one full dry run with a timer. If you're over 4:30, shorten the import and export sections first, never the decisions or AI sections.
- Move the mouse deliberately and pause about half a second on each thing you name; reviewers follow the cursor.
- Use the user switcher, not separate browsers, so the role change is visible on camera.
- If something glitches, keep going and re-record just that section. Most recorders let you trim; one clean take is not required.
- Speak to one reviewer, not an audience. Short sentences, and say why, not just what.
- Upload as unlisted (YouTube or Loom), check it plays signed out, then paste the link into `VIDEO_URL.txt`, `SUBMISSION.md` and `README.md` if needed.
