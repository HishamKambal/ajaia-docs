"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import {
  ApiError,
  listShares,
  listUsers,
  revokeShare,
  shareDocument,
  type DocumentDetail,
  type Share,
  type ShareRole,
  type User,
} from "@/lib/api";
import { Avatar } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { InlineError, Skeleton, Spinner } from "@/components/ui/feedback";
import { CloseIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.");

const ROLE_LABELS: Record<ShareRole, string> = { viewer: "Viewer", editor: "Editor" };

const selectClass =
  "h-9 rounded-lg border border-zinc-300 bg-white ps-2.5 pe-8 text-sm text-zinc-800 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

/**
 * Owners add people by email, change roles and remove access.
 * Everyone else gets a read-only list of who can open the document.
 */
export function ShareDialog({ doc, onClose }: { doc: Pick<DocumentDetail, "id" | "title" | "owner" | "access">; onClose: () => void }) {
  const isOwner = doc.access === "owner";
  const [shares, setShares] = useState<Share[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const load = useCallback(async () => {
    setLoadError(null);
    setShares(null);
    try {
      setShares(await listShares(doc.id));
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [doc.id]);

  useEffect(() => {
    void load();
    // Suggestions are a convenience; typing a full email still works without them.
    if (isOwner) listUsers().then(setUsers, () => undefined);
  }, [load, isOwner]);

  return (
    <Modal title="Share document" description={<span dir="auto">{doc.title}</span>} onClose={onClose}>
      {isOwner && (
        <AddPersonForm
          documentId={doc.id}
          suggestions={users.filter((u) => u.id !== doc.owner.id && !(shares ?? []).some((s) => s.user.id === u.id))}
          onShared={setShares}
        />
      )}

      <h3 className="mt-1 mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">People with access</h3>
      {loadError ? (
        <div className="space-y-3">
          <InlineError>{loadError}</InlineError>
          <Button size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : shares === null ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading people with access">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          <li className="flex items-center gap-3 py-2.5">
            <Avatar name={doc.owner.name} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{doc.owner.name}</span>
            <span className="text-sm text-zinc-500">Owner</span>
          </li>
          {shares.map((share) => (
            <ShareRow key={share.user.id} documentId={doc.id} share={share} editable={isOwner} onChanged={setShares} />
          ))}
          {shares.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">
              {isOwner ? "Only you can open this document so far." : "No one else has access."}
            </li>
          )}
        </ul>
      )}

      {!isOwner && (
        <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Only the owner can change who has access.
        </p>
      )}
    </Modal>
  );
}

function AddPersonForm({
  documentId,
  suggestions,
  onShared,
}: {
  documentId: string;
  suggestions: User[];
  onShared: (shares: Share[]) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Enter an email address.");
    setSubmitting(true);
    setError(null);
    try {
      onShared(await shareDocument(documentId, email.trim(), role));
      setEmail("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mb-5">
      <label htmlFor={`${ids}-email`} className="mb-1.5 block text-sm font-medium text-zinc-800">
        Add people
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${ids}-email`}
          data-autofocus
          type="email"
          inputMode="email"
          autoComplete="off"
          list={`${ids}-users`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="name@ajaia.test"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ids}-error` : undefined}
          className={`h-9 min-w-0 flex-1 rounded-lg border px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-brand ${
            error ? "border-red-400" : "border-zinc-300"
          }`}
        />
        <datalist id={`${ids}-users`}>
          {suggestions.map((u) => (
            <option key={u.id} value={u.email}>
              {u.name}
            </option>
          ))}
        </datalist>
        <div className="flex gap-2">
          <label htmlFor={`${ids}-role`} className="sr-only">
            Role
          </label>
          <select
            id={`${ids}-role`}
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className={`${selectClass} flex-1 sm:flex-none`}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner />}
            Share
          </Button>
        </div>
      </div>
      {error && (
        <div id={`${ids}-error`}>
          <InlineError className="mt-2">{error}</InlineError>
        </div>
      )}
    </form>
  );
}

function ShareRow({
  documentId,
  share,
  editable,
  onChanged,
}: {
  documentId: string;
  share: Share;
  editable: boolean;
  onChanged: (shares: Share[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = share;

  const run = async (action: () => Promise<Share[]>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
        </div>
        {editable ? (
          <div className="flex shrink-0 items-center gap-1">
            {busy && <Spinner className="size-3.5 text-zinc-400" />}
            <select
              aria-label={`Role for ${user.name}`}
              value={role}
              disabled={busy}
              onChange={(e) => void run(() => shareDocument(documentId, user.email, e.target.value as ShareRole))}
              className={selectClass}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="button"
              aria-label={`Remove access for ${user.name}`}
              title="Remove access"
              disabled={busy}
              onClick={() => void run(() => revokeShare(documentId, user.id))}
              className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <span className="text-sm text-zinc-500">{ROLE_LABELS[role]}</span>
        )}
      </div>
      {error && <InlineError className="mt-1.5 ps-10">{error}</InlineError>}
    </li>
  );
}
