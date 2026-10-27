"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { ApiError, createDocument, importFile } from "@/lib/api";
import { IMPORT_EXTENSIONS, validateImportFile } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { InlineError, Spinner } from "@/components/ui/feedback";
import { PlusIcon, UploadIcon } from "@/components/ui/icons";

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.");

/** "New document" and "Import file" — both open the new document's editor on success. */
export function DocumentActions() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const [busy, setBusy] = useState<"create" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy("create");
    setError(null);
    try {
      const doc = await createDocument();
      router.push(`/docs/${doc.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again after an error
    if (!file) return;

    const invalid = validateImportFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy("import");
    setError(null);
    try {
      const doc = await importFile(file);
      router.push(`/docs/${doc.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void create()} disabled={busy !== null} className="flex-1 sm:flex-none">
          {busy === "create" ? <Spinner /> : <PlusIcon />}
          {busy === "create" ? "Creating…" : "New document"}
        </Button>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          aria-describedby={helpId}
          className="flex-1 sm:flex-none"
        >
          {busy === "import" ? <Spinner /> : <UploadIcon />}
          {busy === "import" ? "Importing…" : "Import file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={IMPORT_EXTENSIONS.join(",")}
          onChange={(e) => void onFile(e)}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <p id={helpId} className="text-xs text-zinc-500 sm:text-end">
        Supports .txt, .md, .docx up to 4 MB
      </p>
      {error && <InlineError className="sm:justify-end">{error}</InlineError>}
    </div>
  );
}
