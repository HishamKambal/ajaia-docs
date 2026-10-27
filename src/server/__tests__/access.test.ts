import { describe, expect, it } from "vitest";
import { can, resolveAccess, type AccessLevel, type DocumentAction, type ShareRole } from "@/server/access";

describe("resolveAccess", () => {
  it.each<[string, string, ShareRole | null, AccessLevel | null]>([
    ["u_alice", "u_alice", null, "owner"],
    // Ownership wins even if a stray share row exists for the owner.
    ["u_alice", "u_alice", "viewer", "owner"],
    ["u_alice", "u_bob", "editor", "editor"],
    ["u_alice", "u_sara", "viewer", "viewer"],
    ["u_alice", "u_mallory", null, null],
  ])("owner=%s user=%s share=%s -> %s", (ownerId, userId, share, expected) => {
    expect(resolveAccess(ownerId, userId, share)).toBe(expected);
  });
});

describe("can", () => {
  const matrix: Record<string, Record<DocumentAction, boolean>> = {
    owner: { read: true, edit: true, rename: true, delete: true, share: true },
    editor: { read: true, edit: true, rename: true, delete: false, share: false },
    viewer: { read: true, edit: false, rename: false, delete: false, share: false },
    none: { read: false, edit: false, rename: false, delete: false, share: false },
  };

  const cases = Object.entries(matrix).flatMap(([level, actions]) =>
    Object.entries(actions).map(
      ([action, allowed]) =>
        [level, action as DocumentAction, allowed] as [string, DocumentAction, boolean],
    ),
  );

  it.each(cases)("%s can %s -> %s", (level, action, allowed) => {
    const access = level === "none" ? null : (level as AccessLevel);
    expect(can(access, action)).toBe(allowed);
  });
});
