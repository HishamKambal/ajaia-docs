"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ApiError, deleteDocument, type DocumentSummary } from "@/lib/api";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/format";
import { RoleBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { InlineError, Skeleton, Spinner } from "@/components/ui/feedback";
import { FileTextIcon, TrashIcon } from "@/components/ui/icons";

export function DocumentSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 id={id} className="text-sm font-semibold text-zinc-900">
          {title}
        </h2>
        {count !== undefined && <span className="text-xs text-zinc-500 tabular-nums">{count}</span>}
      </div>
      {children}
    </section>
  );
}

export function DocumentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white" aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 last:border-0">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyList({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60 px-6 py-10 text-center">
      <FileTextIcon className="mx-auto size-6 text-zinc-400" />
      <p className="mt-3 text-sm font-medium text-zinc-800">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export function DocumentList({
  documents,
  variant,
  onDeleted,
}: {
  documents: DocumentSummary[];
  variant: "owned" | "shared";
  onDeleted?: (id: string) => void;
}) {
  return (
    <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} variant={variant} onDeleted={onDeleted} />
      ))}
    </ul>
  );
}

function DocumentRow({
  doc,
  variant,
  onDeleted,
}: {
  doc: DocumentSummary;
  variant: "owned" | "shared";
  onDeleted?: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = doc.access === "owner" && onDeleted;

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteDocument(doc.id);
      onDeleted?.(doc.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the document.");
      setDeleting(false);
    }
  };

  return (
    <li className="group relative border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
          <FileTextIcon />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/docs/${doc.id}`}
            dir="auto"
            className="block truncate text-sm font-medium text-zinc-900 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"
          >
            {doc.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {variant === "shared" && (
              <>
                <span className="truncate">{doc.owner.name}</span>
                <RoleBadge role={doc.access} />
                <span aria-hidden="true">·</span>
              </>
            )}
            <time dateTime={doc.updatedAt} title={formatAbsoluteTime(doc.updatedAt)}>
              Updated {formatRelativeTime(doc.updatedAt)}
            </time>
          </p>
        </div>
        {canDelete && !confirming && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label={`Delete “${doc.title}”`}
            title="Delete"
            className="relative z-10 px-2! text-zinc-400 hover:bg-red-50 hover:text-red-700"
          >
            <TrashIcon />
          </Button>
        )}
      </div>

      {confirming && (
        <div
          role="group"
          aria-label="Confirm delete"
          className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-red-100 bg-red-50 px-4 py-2.5"
        >
          <p className="text-sm text-red-900">Delete this document for everyone? This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirming(false)} disabled={deleting} autoFocus>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={() => void remove()} disabled={deleting}>
              {deleting && <Spinner />}
              Delete
            </Button>
          </div>
          {error && <InlineError className="w-full">{error}</InlineError>}
        </div>
      )}
    </li>
  );
}
