"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, UNAUTHORIZED_EVENT, getSession, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageState, Spinner } from "@/components/ui/feedback";
import { CloudOffIcon, RefreshIcon } from "@/components/ui/icons";
import { Dashboard } from "./dashboard";
import { SignInCard } from "./sign-in-card";

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: User | null };

/** Root view: mocked sign-in when there is no session, the dashboard otherwise. */
export function HomeScreen() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const load = useCallback(async () => {
    setSession({ status: "loading" });
    try {
      setSession({ status: "ready", user: await getSession() });
    } catch (err) {
      setSession({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
    }
  }, []);

  useEffect(() => {
    void load();
    const onUnauthorized = () => setSession({ status: "ready", user: null });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [load]);

  if (session.status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center text-zinc-400">
        <Spinner className="size-6" label="Loading" />
      </main>
    );
  }

  if (session.status === "error") {
    return (
      <PageState icon={<CloudOffIcon className="size-6" />} title="Couldn't connect" description={session.message}>
        <Button variant="primary" onClick={() => void load()}>
          <RefreshIcon /> Try again
        </Button>
      </PageState>
    );
  }

  const setUser = (user: User | null) => setSession({ status: "ready", user });
  return session.user ? (
    <Dashboard user={session.user} onSignedOut={() => setUser(null)} />
  ) : (
    <SignInCard onSignedIn={setUser} />
  );
}
