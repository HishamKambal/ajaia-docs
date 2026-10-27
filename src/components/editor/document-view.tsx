"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, getDocument, type DocumentDetail } from "@/lib/api";
import { Button, buttonClass } from "@/components/ui/button";
import { PageState, Skeleton } from "@/components/ui/feedback";
import { AlertIcon, BackIcon, CloudOffIcon, FileTextIcon, RefreshIcon } from "@/components/ui/icons";
import { DocumentWorkspace } from "./document-workspace";

type LoadState = { status: "loading" } | { status: "error"; error: ApiError } | { status: "ready"; doc: DocumentDetail };

/** Loads a document and renders the editor, or a full-page loading / error state. */
export function DocumentView({ documentId }: { documentId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", doc: await getDocument(documentId) });
    } catch (err) {
      setState({ status: "error", error: err instanceof ApiError ? err : new ApiError(500, "Something went wrong.") });
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") return <EditorSkeleton />;
  if (state.status === "ready") return <DocumentWorkspace initialDoc={state.doc} />;

  const { error } = state;
  const backLink = (
    <Link href="/" className={buttonClass("secondary")}>
      <BackIcon /> Back to documents
    </Link>
  );

  if (error.status === 404 || error.status === 403) {
    return (
      <PageState
        icon={<FileTextIcon className="size-6" />}
        title="Document not found or you don't have access"
        description="It may have been deleted, or the owner hasn't shared it with you."
      >
        {backLink}
      </PageState>
    );
  }
  if (error.status === 401) {
    return (
      <PageState icon={<AlertIcon className="size-6" />} title="Your session has ended" description="Choose a demo user to keep going.">
        <Link href="/" className={buttonClass("primary")}>
          Go to sign-in
        </Link>
      </PageState>
    );
  }
  return (
    <PageState
      icon={<CloudOffIcon className="size-6" />}
      title="Couldn't load this document"
      description={error.isNetworkError ? error.message : `${error.message} Please try again.`}
    >
      <Button variant="primary" onClick={() => void load()}>
        <RefreshIcon /> Retry
      </Button>
      {backLink}
    </PageState>
  );
}

function EditorSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading document">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Skeleton className="size-8" />
          <Skeleton className="h-5 w-48" />
          <div className="ms-auto flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[52rem] px-3 py-6 sm:px-6">
        <Skeleton className="mb-4 h-10 w-full rounded-xl" />
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 sm:p-14">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
