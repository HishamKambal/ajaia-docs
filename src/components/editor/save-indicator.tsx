import { Spinner } from "@/components/ui/feedback";
import { AlertIcon, CheckIcon } from "@/components/ui/icons";
import type { SaveStatus } from "./use-autosave";

export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex h-6 items-center text-xs whitespace-nowrap">
      {status === "error" ? (
        <span className="flex items-center gap-1.5 text-red-700">
          <AlertIcon className="size-3.5" />
          Couldn&apos;t save —
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline underline-offset-2 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-brand"
          >
            Retry
          </button>
        </span>
      ) : status === "saved" ? (
        <span className="flex items-center gap-1.5 text-zinc-500">
          <CheckIcon className="size-3.5" />
          All changes saved
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-zinc-500">
          <Spinner className="size-3.5" />
          Saving…
        </span>
      )}
    </div>
  );
}
