"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "pending" | "saving" | "error";

type SaveFn = (html: string, opts: { keepalive: boolean }) => Promise<unknown>;

interface Autosave {
  status: SaveStatus;
  /** Queue the latest content; it is saved after `delayMs` without further edits. */
  schedule: (html: string) => void;
  /** Save anything pending right now. Resolves true once everything is saved. */
  flush: () => Promise<boolean>;
}

/**
 * Debounced autosave. Saves are serialized (never two PATCHes in flight), the
 * newest content always wins, a failed save keeps its content for a retry, and
 * anything still pending on unmount is sent with `keepalive`.
 */
export function useAutosave(save: SaveFn, delayMs = 800): Autosave {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const saveRef = useRef(save);
  const state = useRef<{ pending: string | null; timer?: ReturnType<typeof setTimeout>; queue: Promise<boolean> }>({
    pending: null,
    queue: Promise.resolve(true),
  });

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const [api] = useState(() => {
    const run = async (): Promise<boolean> => {
      const s = state.current;
      if (s.pending === null) return true;
      const html = s.pending;
      s.pending = null;
      setStatus("saving");
      try {
        await saveRef.current(html, { keepalive: false });
      } catch {
        // Keep the failed content unless the user has typed something newer since.
        s.pending ??= html;
        setStatus("error");
        return false;
      }
      if (s.pending !== null) return run();
      setStatus("saved");
      return true;
    };

    const flush = () => {
      const s = state.current;
      clearTimeout(s.timer);
      s.queue = s.queue.then(run);
      return s.queue;
    };

    const schedule = (html: string) => {
      const s = state.current;
      s.pending = html;
      setStatus((prev) => (prev === "saving" ? prev : "pending"));
      clearTimeout(s.timer);
      s.timer = setTimeout(() => void flush(), delayMs);
    };

    return { flush, schedule };
  });

  useEffect(() => {
    const s = state.current;
    return () => {
      clearTimeout(s.timer);
      if (s.pending !== null) void saveRef.current(s.pending, { keepalive: true }).catch(() => undefined);
    };
  }, []);

  // Warn before closing the tab while edits haven't reached the server.
  useEffect(() => {
    if (status === "saved") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  return { status, ...api };
}
