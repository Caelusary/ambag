"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { rotateInviteCode } from "@/actions/groups";
import { useSpace } from "@/lib/space";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** How teammates get in: the group's invite code. Only the leader can replace it. */
export function InviteCard() {
  const { kind, groupId, inviteCode } = useSpace();
  const { role } = useStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (kind !== "live" || !groupId || !inviteCode) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteCode!);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function rotate() {
    startTransition(async () => {
      const code = await rotateInviteCode(groupId!);
      setFailed(code == null);
      setCopied(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <UserPlus
          size={20}
          strokeWidth={2.25}
          aria-hidden="true"
          className="mt-0.5 text-accent-600"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[17px] text-text">Invite teammates</h2>
          <p className="mt-1 text-sm text-neutral-700">
            They sign up, then enter this code to join the group.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-[var(--radius-base)] bg-bg px-3 py-2 font-body text-lg font-bold tracking-[0.18em] text-text">
              {inviteCode}
            </code>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            {role === "leader" && (
              <Button variant="secondary" size="sm" disabled={pending} onClick={rotate}>
                {pending ? "Replacing…" : "New code"}
              </Button>
            )}
          </div>
          {role === "leader" && (
            <p className="mt-2 text-xs text-neutral-700">
              {failed
                ? "Couldn't replace the code. Try again."
                : "A new code stops the old one working, for anyone who hasn't joined yet."}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
