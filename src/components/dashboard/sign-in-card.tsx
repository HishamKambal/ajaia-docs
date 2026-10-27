"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, listUsers, signIn, type User } from "@/lib/api";
import { Avatar } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { InlineError, Skeleton, Spinner } from "@/components/ui/feedback";
import { Logo } from "@/components/ui/logo";

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.");

/** Mocked sign-in: pick one of the seeded demo accounts. */
export function SignInCard({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setUsers(null);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (user: User) => {
    setPendingId(user.id);
    setSignInError(null);
    try {
      onSignedIn(await signIn(user.id));
    } catch (err) {
      setSignInError(errorMessage(err));
      setPendingId(null);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <section
          aria-labelledby="sign-in-title"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h1 id="sign-in-title" className="text-lg font-semibold text-zinc-900">
            Choose a demo user
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Authentication is mocked for this demo. Pick an account to continue as that person.
          </p>

          <div className="mt-5">
            {loadError ? (
              <div className="space-y-3">
                <InlineError>{loadError}</InlineError>
                <Button size="sm" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : users === null ? (
              <ul className="space-y-2" aria-label="Loading users">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : users.length === 0 ? (
              <p className="text-sm text-zinc-600">No demo users found. Is the database seeded?</p>
            ) : (
              <ul className="space-y-2">
                {users.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => void choose(user)}
                      disabled={pendingId !== null}
                      className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 p-3 text-start transition-colors hover:border-brand/40 hover:bg-brand-soft/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                    >
                      <Avatar name={user.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900">{user.name}</span>
                        <span className="block truncate text-xs text-zinc-500">{user.email}</span>
                      </span>
                      {pendingId === user.id && <Spinner className="size-4 text-brand" label="Signing in" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {signInError && <InlineError className="mt-3">{signInError}</InlineError>}
          </div>
        </section>
        <p className="mt-4 text-center text-xs text-zinc-500">
          Tip: sign in as different users to try sharing and access roles.
        </p>
      </div>
    </main>
  );
}
