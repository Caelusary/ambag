"use client";

import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/feedback";

/**
 * The leader's control over who can see the read-only view. Each link carries its own random
 * token and can be revoked on its own, so a link that leaks can be cut off without breaking the
 * one the professor already has.
 */
export function ShareLinks() {
  const { role, members, shareLinks, createShareLink, revokeShareLink } = useStore();
  const [copied, setCopied] = useState<string | null>(null);
  const active = shareLinks.filter((l) => l.revokedAt == null);

  if (role !== "leader") {
    return (
      <Card>
        <Notice>
          Only {members.find((m) => m.role === "leader")?.name ?? "the leader"}, as group leader,
          can create or revoke share links. Ask them for the link.
        </Notice>
      </Card>
    );
  }

  const urlFor = (token: string) =>
    typeof window === "undefined" ? `/s/${token}` : `${window.location.origin}/s/${token}`;

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(urlFor(token));
      setCopied(token);
    } catch {
      setCopied(null);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-[17px] text-text">Share links</h2>
        <Button variant="secondary" size="sm" onClick={() => createShareLink()}>
          New link
        </Button>
      </div>
      {active.length === 0 && (
        <Notice>No active links. Nobody outside the group can see this.</Notice>
      )}
      <ul className="flex flex-col gap-2.5">
        {active.map((link) => (
          <li
            key={link.token}
            className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-2.5 first:border-t-0 first:pt-0"
          >
            <code className="min-w-0 flex-1 truncate text-xs text-text">/s/{link.token}</code>
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Copy link ending ${link.token.slice(-4)}`}
              onClick={() => copy(link.token)}
            >
              {copied === link.token ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Revoke link ending ${link.token.slice(-4)}`}
              onClick={() => revokeShareLink(link.token)}
            >
              Revoke
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
