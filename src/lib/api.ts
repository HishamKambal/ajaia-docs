import type { ShareRole } from "@/server/access";
import type { DocumentDetail, DocumentSummary, Share, User } from "@/server/documents";

// Typed client for the JSON API. Every helper throws an ApiError on failure, so
// callers can branch on `status` (0 means the server couldn't be reached).

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Fired on `window` when the session is gone, so the home view can show sign-in. */
export const UNAUTHORIZED_EVENT = "ajaia:unauthorized";

function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  else window.location.assign("/");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  keepalive?: boolean;
}

async function request<T>(path: string, { method = "GET", json, form, keepalive }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
      body: json === undefined ? form : JSON.stringify(json),
      credentials: "same-origin",
      cache: "no-store",
      keepalive,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const error = (body as { error?: unknown } | null)?.error;
    throw new ApiError(res.status, typeof error === "string" ? error : `Request failed (${res.status})`);
  }
  return body as T;
}

export type { DocumentDetail, DocumentSummary, Share, ShareRole, User };
export type ExportFormat = "md" | "html";

export const getSession = () => request<{ user: User | null }>("/api/session").then((r) => r.user);

export const signIn = (userId: string) =>
  request<{ user: User }>("/api/session", { method: "POST", json: { userId } }).then((r) => r.user);

export const signOut = () => request<{ ok: true }>("/api/session", { method: "DELETE" });

export const listUsers = () => request<{ users: User[] }>("/api/users").then((r) => r.users);

export const listDocuments = () => request<{ owned: DocumentSummary[]; shared: DocumentSummary[] }>("/api/documents");

export const createDocument = (input: { title?: string; content?: string } = {}) =>
  request<{ document: DocumentDetail }>("/api/documents", { method: "POST", json: input }).then((r) => r.document);

export const getDocument = (id: string) =>
  request<{ document: DocumentDetail }>(`/api/documents/${encodeURIComponent(id)}`).then((r) => r.document);

export const updateDocument = (id: string, patch: { title?: string; content?: string }, opts: { keepalive?: boolean } = {}) =>
  request<{ document: DocumentDetail }>(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: patch,
    keepalive: opts.keepalive,
  }).then((r) => r.document);

export const deleteDocument = (id: string) =>
  request<{ ok: true }>(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE" });

export const listShares = (id: string) =>
  request<{ shares: Share[] }>(`/api/documents/${encodeURIComponent(id)}/shares`).then((r) => r.shares);

/** Adds a person, or changes their role if they already have access. */
export const shareDocument = (id: string, email: string, role: ShareRole) =>
  request<{ shares: Share[] }>(`/api/documents/${encodeURIComponent(id)}/shares`, {
    method: "POST",
    json: { email, role },
  }).then((r) => r.shares);

export const revokeShare = (id: string, userId: string) =>
  request<{ shares: Share[] }>(
    `/api/documents/${encodeURIComponent(id)}/shares/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  ).then((r) => r.shares);

export const importFile = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<{ document: DocumentDetail }>("/api/import", { method: "POST", form }).then((r) => r.document);
};

export const exportUrl = (id: string, format: ExportFormat) =>
  `/api/documents/${encodeURIComponent(id)}/export?format=${format}`;
