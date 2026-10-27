import type { AccessLevel } from "@/server/access";
import { initials } from "@/lib/format";

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-7 text-[11px]" : "size-9 text-xs";
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand`}
    >
      {initials(name)}
    </span>
  );
}

const ROLE_STYLES: Record<AccessLevel, string> = {
  owner: "bg-zinc-900 text-white",
  editor: "bg-brand-soft text-brand",
  viewer: "bg-zinc-100 text-zinc-700",
};

/** Compact role label used in document lists: "Editor" / "Viewer". */
export function RoleBadge({ role }: { role: AccessLevel }) {
  const label = role === "owner" ? "Owner" : role === "editor" ? "Editor" : "Viewer";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}>
      {label}
    </span>
  );
}

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Owner",
  editor: "Can edit",
  viewer: "View only",
};

/** What the current user may do with an open document. */
export function AccessBadge({ access }: { access: AccessLevel }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap ${ROLE_STYLES[access]}`}
      title={`Your access: ${ACCESS_LABELS[access]}`}
    >
      {ACCESS_LABELS[access]}
    </span>
  );
}
