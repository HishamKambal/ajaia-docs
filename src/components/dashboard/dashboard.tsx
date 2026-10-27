"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, listDocuments, type DocumentSummary, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/feedback";
import { RefreshIcon } from "@/components/ui/icons";
import { AppHeader } from "./app-header";
import { DocumentActions } from "./document-actions";
import { DocumentList, DocumentListSkeleton, DocumentSection, EmptyList } from "./document-list";

type Lists = { owned: DocumentSummary[]; shared: DocumentSummary[] };
type ListState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; lists: Lists };

export function Dashboard({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [state, setState] = useState<ListState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", lists: await listDocuments() });
    } catch (err) {
      setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, user.id]);

  const removeOwned = (id: string) =>
    setState((s) => (s.status === "ready" ? { status: "ready", lists: { ...s.lists, owned: s.lists.owned.filter((d) => d.id !== id) } } : s));

  const firstName = user.name.split(" ")[0];

  return (
    <div className="min-h-dvh">
      <AppHeader user={user} onSignedOut={onSignedOut} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Documents</h1>
            <p className="mt-1 text-sm text-zinc-600">Welcome back, {firstName}. Pick up where you left off.</p>
          </div>
          <DocumentActions />
        </div>

        {state.status === "error" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <InlineError>Couldn&apos;t load your documents. {state.message}</InlineError>
            <Button size="sm" className="mt-3" onClick={() => void load()}>
              <RefreshIcon /> Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            <DocumentSection title="My documents" count={state.status === "ready" ? state.lists.owned.length : undefined}>
              {state.status === "loading" ? (
                <DocumentListSkeleton />
              ) : state.lists.owned.length === 0 ? (
                <EmptyList
                  title="No documents yet"
                  description="Create a new document or import a .txt, .md or .docx file to get started."
                />
              ) : (
                <DocumentList documents={state.lists.owned} variant="owned" onDeleted={removeOwned} />
              )}
            </DocumentSection>

            <DocumentSection title="Shared with me" count={state.status === "ready" ? state.lists.shared.length : undefined}>
              {state.status === "loading" ? (
                <DocumentListSkeleton rows={2} />
              ) : state.lists.shared.length === 0 ? (
                <EmptyList
                  title="Nothing shared with you yet"
                  description="When someone shares a document with you, it will show up here."
                />
              ) : (
                <DocumentList documents={state.lists.shared} variant="shared" />
              )}
            </DocumentSection>
          </div>
        )}
      </main>
    </div>
  );
}
