// Pure access-control rules. Kept free of I/O so they are trivially testable
// and every API route goes through the same decision.

export type ShareRole = "viewer" | "editor";
export type AccessLevel = "owner" | ShareRole;
export type DocumentAction = "read" | "edit" | "rename" | "delete" | "share";

export function resolveAccess(
  ownerId: string,
  userId: string,
  shareRole: ShareRole | null,
): AccessLevel | null {
  if (ownerId === userId) return "owner";
  return shareRole;
}

const ALLOWED: Record<AccessLevel, ReadonlySet<DocumentAction>> = {
  owner: new Set(["read", "edit", "rename", "delete", "share"]),
  editor: new Set(["read", "edit", "rename"]),
  viewer: new Set(["read"]),
};

export function can(access: AccessLevel | null, action: DocumentAction): boolean {
  return access !== null && ALLOWED[access].has(action);
}
