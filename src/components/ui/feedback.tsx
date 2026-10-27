import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

// Small presentational building blocks for loading and status feedback.

export function Spinner({ className = "size-4", label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex items-center">
      <svg viewBox="0 0 24 24" className={`${className} animate-spin`} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-zinc-200/80 ${className}`} />;
}

export function InlineError({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-1.5 text-sm text-red-700 ${className}`}>
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Centered, full-page message used for 404 / session / network failures. */
export function PageState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {icon && (
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
            {icon}
          </div>
        )}
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-zinc-600">{description}</p>}
        {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>}
      </div>
    </main>
  );
}
