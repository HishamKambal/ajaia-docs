"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from "react";
import { exportUrl, type ExportFormat } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, DownloadIcon } from "@/components/ui/icons";

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "md", label: "Markdown (.md)" },
  { format: "html", label: "HTML (.html)" },
];

/** Download menu. `beforeExport` lets the editor flush unsaved edits first. */
export function ExportMenu({ documentId, beforeExport }: { documentId: string; beforeExport: () => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const download = async (e: MouseEvent<HTMLAnchorElement>) => {
    // Save pending edits first so the file matches what's on screen.
    e.preventDefault();
    const href = e.currentTarget.href;
    setOpen(false);
    await beforeExport();
    const a = document.createElement("a");
    a.href = href;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={buttonRef}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <DownloadIcon />
        <span className="hidden sm:inline">Export</span>
        <span className="sr-only sm:hidden">Export</span>
        <ChevronDownIcon className="size-3.5 text-zinc-500" />
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Export as"
          onKeyDown={onMenuKey}
          className="absolute end-0 top-full z-40 mt-1.5 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
        >
          {FORMATS.map(({ format, label }) => (
            <a
              key={format}
              role="menuitem"
              href={exportUrl(documentId, format)}
              download
              onClick={(e) => void download(e)}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
