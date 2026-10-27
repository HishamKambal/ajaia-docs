"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { MAX_TITLE_LENGTH } from "@/lib/format";

const lengthError = (title: string) =>
  title.trim().length > MAX_TITLE_LENGTH
    ? `Title must be ${MAX_TITLE_LENGTH} characters or fewer (${title.trim().length}/${MAX_TITLE_LENGTH}).`
    : null;

/** Inline document title: renames on blur or Enter, Escape reverts. */
export function TitleInput({
  value,
  disabled,
  onRename,
}: {
  value: string;
  disabled: boolean;
  onRename: (title: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const skipCommit = useRef(false);
  const errorId = useId();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = async () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    const invalid = lengthError(draft);
    if (invalid) return setError(invalid);
    const next = draft.trim().replace(/\s+/g, " ");
    if (next === value) {
      setDraft(value);
      return setError(null);
    }
    setSaving(true);
    try {
      await onRename(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't rename the document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={`${errorId}-input`} className="sr-only">
        Document title
      </label>
      <input
        id={`${errorId}-input`}
        dir="auto"
        value={draft}
        disabled={disabled}
        readOnly={saving}
        placeholder="Untitled document"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(lengthError(e.target.value));
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            skipCommit.current = true;
            setDraft(value);
            setError(null);
            e.currentTarget.blur();
          }
        }}
        title={disabled ? "Only owners and editors can rename this document" : "Rename document"}
        className={`w-full min-w-0 truncate rounded-md border bg-transparent px-2 py-1 text-base font-semibold text-zinc-900 transition-colors sm:text-lg ${
          error
            ? "border-red-400 focus:outline-2 focus:outline-red-200"
            : "border-transparent hover:border-zinc-200 focus:border-brand focus:outline-2 focus:outline-brand/20"
        } disabled:cursor-default disabled:hover:border-transparent`}
      />
      {error && (
        <p id={errorId} role="alert" className="px-2 pt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
