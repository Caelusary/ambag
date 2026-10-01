"use client";

import { useSyncExternalStore } from "react";
import { useStore } from "@/lib/store";
import { ShareContent } from "./ShareContent";

const subscribe = () => () => {};

/**
 * The public view only shows the log for a token that exists and hasn't been revoked. Links live
 * in the client store, so the server can't check them: until the page has mounted it renders a
 * neutral placeholder on both sides, which keeps hydration consistent, then decides.
 */
export function PublicShare({ token }: { token: string }) {
  const { shareLinks } = useStore();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="text-sm text-neutral-700">Checking the link…</div>;
  }

  // Same answer for a token that never existed and one that was revoked, so nobody can tell
  // which tokens were ever real.
  const link = shareLinks.find((l) => l.token === token && l.revokedAt == null);
  if (!link) {
    return (
      <div className="text-sm text-text">
        This link isn&apos;t valid. It may have been revoked. Ask the group for a new one.
      </div>
    );
  }

  return <ShareContent />;
}
