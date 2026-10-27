# Verification checklist

What I checked before submitting. Automated gates run on every change; the manual passes were run against the local build and again against the live deployment.

## 1. Automated gates

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (unit + integration on in-memory PGlite)
- [ ] `npm run build` passes (production build)
- [ ] GitHub Actions CI is green (typecheck, lint, tests)
- [ ] `npm audit` shows no critical advisories (Next.js pinned to 15.5.28)

## 2. API negative cases (curl)

Set up: `B=http://localhost:3000`. Sign in by saving the cookie, e.g. `curl -c alice.txt -H 'content-type: application/json' -d '{"userId":"u_alice"}' $B/api/session` (repeat for `u_bob`, `u_sara`).

- [ ] No cookie: `GET /api/documents` returns **401** `{"error":"Choose a user to continue"}`
- [ ] Unknown user on sign-in: `POST /api/session {"userId":"nope"}` returns **400**
- [ ] Invalid JSON body returns **400** "Request body must be valid JSON"
- [ ] Non-existent id: `GET /api/documents/d_missing` returns **404**
- [ ] No access: Bob opens a document Alice did not share with him and gets **404** (not 403)
- [ ] Viewer edit: Sara `PATCH /api/documents/d_welcome {"content":"..."}` returns **403**
- [ ] Viewer rename: Sara `PATCH {"title":"x"}` returns **403**
- [ ] Editor share: Bob `POST /api/documents/d_welcome/shares` returns **403**
- [ ] Editor delete: Bob `DELETE /api/documents/d_welcome` returns **403**
- [ ] Empty patch: `PATCH {}` returns **400** "Nothing to update"
- [ ] Title over 200 characters returns **400**
- [ ] Content over 1 MB returns **400**
- [ ] Share with invalid email returns **400**; unknown email returns **404**; owner's own email returns **400**
- [ ] `<script>` / `onerror=` in content is stripped from the stored document
- [ ] Export with `?format=pdf` returns **400**
- [ ] Import: no file **400**, empty file **400**, `.pdf` **400** (unsupported), file over 4 MB **400**, corrupt `.docx` **400**

## 3. Browser flows per user

**Alice (owner)**
- [ ] Sign-in screen lists the three seeded users
- [ ] "Welcome to Ajaia Docs" is under **My documents**
- [ ] Create a document, type, apply bold / italic / underline / H1-H3 / bullet / numbered list, undo / redo
- [ ] Status shows *Saving...* then *Saved*; reload shows the content persisted
- [ ] Inline rename persists after reload
- [ ] Navigating away with unsaved changes triggers the guard
- [ ] Share with Bob (Editor) and Sara (Viewer); change a role; revoke and re-add
- [ ] Network failure (DevTools offline) shows *Retry*; recovering saves

**Bob (editor)**
- [ ] The shared doc appears under **Shared with me** with owner name and an Editor badge
- [ ] Can edit and rename; changes autosave and are visible to Alice after reload
- [ ] Cannot share or delete (controls hidden)

**Sara (viewer)**
- [ ] The shared doc appears under **Shared with me** with a Viewer badge
- [ ] Document is read-only: no toolbar, no rename, no share
- [ ] Can export

**General**
- [ ] Opening a document id you have no access to shows a friendly not-found state
- [ ] "Switch user" returns to the sign-in screen

## 4. Import / export

- [ ] Import `samples/sample-plain.txt`: paragraphs preserved, `<tags>` and `&` shown as text
- [ ] Import `samples/sample-notes.md`: headings, bold, italic, both list types
- [ ] Import `samples/sample-brief.docx`: headings, bold, italic, bullet and numbered lists
- [ ] Each import opens a **new** document titled after the file name
- [ ] Unsupported type and oversized file show a clear error in the UI
- [ ] Export Markdown: headings, lists, emphasis correct; underline kept as `<u>`
- [ ] Export HTML: opens standalone in a browser with the document title
- [ ] Exported filename matches the document title

## 5. RTL / mobile

- [ ] Arabic paragraph renders right-to-left; English paragraphs in the same doc stay left-to-right
- [ ] Import `samples/sample-arabic.md`: mixed headings and list items each take the right direction
- [ ] Arabic text survives save, reload and export
- [ ] At ~375 px width: lists, toolbar, editor and share dialog are usable with no horizontal scroll

## 6. Deployment smoke test (live URL)

- [ ] `DATABASE_URL` (Neon) is set in Vercel; first request creates the schema and seed
- [ ] Sign in as each demo user; the welcome doc shows the correct role for each
- [ ] Create and edit a document, then reload: it persists (data is in Neon, not the function filesystem)
- [ ] Share flow works across users on the live site
- [ ] Import one `.docx` and export one `.md` on the live site
- [ ] No errors in the browser console or Vercel function logs during the pass

## Run log: 2026-10-27, production (https://ajaia-docs-sigma-pearl.vercel.app)

These were actually run, not just planned:

- `npm run typecheck`, `npm run lint`, `npm test` (77/77 passing) and `npm run build`: all green.
- Zip-bomb `.docx` (51 MB of XML, under 4 MB compressed), including one with falsified size headers and one hiding entries behind a false entry count → 400, capped during inflation (regression tests)
- `curl` permission matrix against production:
  - no session → 401
  - stranger → 404 before sharing and after revoke/delete
  - editor edit → 200
  - editor share → 403
  - invalid email → 400
  - `.exe` upload → 400
  - `.md` and `.docx` import → 201 with headings, bold and lists preserved
  - `<script>` stripped on create
  - **Found and fixed:** `" SARA@ajaia.test "` was rejected by the API schema (see AI_WORKFLOW.md)
- Browser pass on production:
  - as Alice: create, rename, bold, H1, bullet and numbered list; reload → everything persisted; share with Bob as Editor through the dialog
  - as Bob: both docs under "Shared with me" with Editor badges
  - as Sara: welcome doc read-only with the "View only" banner and no toolbar; the Arabic paragraph renders right-to-left
