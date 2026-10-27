"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { updateDocument, type DocumentDetail } from "@/lib/api";
import { AccessBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { BackIcon, EyeIcon, UsersIcon } from "@/components/ui/icons";
import { ShareDialog } from "@/components/share/share-dialog";
import { ExportMenu } from "./export-menu";
import { SaveIndicator } from "./save-indicator";
import { TextDirection } from "./text-direction";
import { TitleInput } from "./title-input";
import { Toolbar } from "./toolbar";
import { useAutosave } from "./use-autosave";

export function DocumentWorkspace({ initialDoc }: { initialDoc: DocumentDetail }) {
  const { id, access, owner } = initialDoc;
  const canEdit = access !== "viewer";
  const [title, setTitle] = useState(initialDoc.title);
  const [shareOpen, setShareOpen] = useState(false);

  const save = useCallback(
    (html: string, opts: { keepalive: boolean }) => updateDocument(id, { content: html }, opts),
    [id],
  );
  const { status, schedule, flush } = useAutosave(save);

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    content: initialDoc.content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: !canEdit, autolink: true },
      }),
      TextDirection,
    ],
    editorProps: {
      attributes: {
        "aria-label": "Document content",
        "aria-readonly": String(!canEdit),
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: e }) => schedule(e.getHTML()),
  });

  useEffect(() => {
    document.title = `${title} · Ajaia Docs`;
  }, [title]);

  // Ctrl/Cmd+S saves immediately instead of opening the browser's save dialog.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit) void flush();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, flush]);

  const rename = async (next: string) => {
    const doc = await updateDocument(id, { title: next });
    setTitle(doc.title);
  };

  // Clicking the page margin below the text puts the caret at the end.
  const focusFromSheet = (e: MouseEvent<HTMLDivElement>) => {
    if (canEdit && editor && e.target === e.currentTarget) editor.commands.focus("end");
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 basis-64 items-start gap-1.5">
            <Link
              href="/"
              aria-label="Back to documents"
              title="Back to documents"
              className="mt-0.5 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <BackIcon />
            </Link>
            <div className="min-w-0 flex-1">
              <TitleInput value={title} disabled={!canEdit} onRename={rename} />
              <div className="flex flex-wrap items-center gap-x-3 px-2">
                {canEdit ? (
                  <SaveIndicator status={status} onRetry={() => void flush()} />
                ) : (
                  <span className="flex h-6 items-center text-xs text-zinc-500">Owned by {owner.name}</span>
                )}
              </div>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <AccessBadge access={access} />
            <ExportMenu documentId={id} beforeExport={canEdit ? flush : () => Promise.resolve(true)} />
            <Button size="sm" variant={access === "owner" ? "primary" : "secondary"} onClick={() => setShareOpen(true)}>
              <UsersIcon />
              Share
            </Button>
          </div>
        </div>
      </header>

      {!canEdit && (
        <div role="note" className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 text-sm text-amber-900 sm:px-6">
            <EyeIcon className="size-4 shrink-0" />
            View only — ask the owner for edit access
          </p>
        </div>
      )}

      <main className="mx-auto max-w-[52rem] px-3 pt-4 pb-24 sm:px-6">
        {canEdit && (
          <div className="sticky top-2 z-20 mb-4">
            {editor ? <Toolbar editor={editor} /> : <Skeleton className="h-10 w-full rounded-xl" />}
          </div>
        )}
        <div
          onClick={focusFromSheet}
          className={`min-h-[70vh] rounded-xl border border-zinc-200 bg-white px-5 py-8 shadow-sm sm:px-14 sm:py-14 ${
            canEdit ? "cursor-text" : ""
          }`}
        >
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}
        </div>
      </main>

      {shareOpen && <ShareDialog doc={{ ...initialDoc, title }} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
