"use client";

import { useState } from "react";
import { signOut, type User } from "@/lib/api";
import { Avatar } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { SwitchUserIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";

export function AppHeader({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [switching, setSwitching] = useState(false);

  const switchUser = async () => {
    setSwitching(true);
    // Even if the request fails, returning to the chooser is the right outcome.
    await signOut().catch(() => undefined);
    onSignedOut();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2" title={user.email}>
            <Avatar name={user.name} size="sm" />
            <span className="hidden truncate text-sm font-medium text-zinc-800 sm:inline">{user.name}</span>
            <span className="sr-only sm:hidden">Signed in as {user.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void switchUser()} disabled={switching}>
            {switching ? <Spinner /> : <SwitchUserIcon />}
            Switch user
          </Button>
        </div>
      </div>
    </header>
  );
}
