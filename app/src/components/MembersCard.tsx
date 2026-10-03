"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup, transferLeadership } from "@/actions/groups";
import { useSpace } from "@/lib/space";
import { useStore } from "@/lib/store-context";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Tag } from "@/components/ui/Tag";

type Pending = { kind: "lead"; member: Member } | { kind: "leave" };

/**
 * Who's in the group. The leader can hand the role to a teammate; anyone else can leave. Both go
 * through a confirmation, since neither can be undone from your side.
 */
export function MembersCard() {
  const { kind, groupId } = useSpace();
  const { members, currentUser, role } = useStore();
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (kind !== "live" || !groupId) return null;

  function confirm() {
    if (!pending) return;
    startTransition(async () => {
      const message =
        pending.kind === "lead"
          ? await transferLeadership(groupId!, pending.member.id)
          : await leaveGroup(groupId!);
      setError(message);
      setPending(null);
      if (!message) router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="mb-3 font-heading text-[17px] text-text">Members</h2>
      <ul className="flex flex-col">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex min-h-12 items-center gap-2.5 border-t border-neutral-200 py-2 first:border-t-0 first:pt-0"
          >
            <Avatar name={m.name} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
              {m.name}
              {m.id === currentUser && <span className="text-neutral-700"> (you)</span>}
            </span>
            {m.role === "leader" && <Tag variant="accent">Leader</Tag>}
            {role === "leader" && m.role !== "leader" && (
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Make ${m.name} the leader`}
                onClick={() => setPending({ kind: "lead", member: m })}
              >
                Make leader
              </Button>
            )}
          </li>
        ))}
      </ul>

      {role !== "leader" && (
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <Button variant="secondary" size="sm" onClick={() => setPending({ kind: "leave" })}>
            Leave group
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-700">
          {error}
        </p>
      )}

      {pending && (
        <Dialog
          title={
            pending.kind === "lead"
              ? `Make ${pending.member.name} the leader?`
              : "Leave this group?"
          }
          onClose={() => setPending(null)}
          actions={
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={busy} onClick={confirm}>
                {busy ? "Working…" : pending.kind === "lead" ? "Make leader" : "Leave group"}
              </Button>
            </>
          }
        >
          <p>
            {pending.kind === "lead"
              ? `${pending.member.name} will review work, decide swaps and manage share links. You stay in the group as a member.`
              : "Tasks you haven't finished go back to the pool. Accepted work stays credited to you, and you'll need a new invite code to come back."}
          </p>
        </Dialog>
      )}
    </Card>
  );
}
