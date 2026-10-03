"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useNow } from "@/lib/clock";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/feedback";
import { FIELD_CONTROL, FieldLabel } from "@/components/ui/fields";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Avatar } from "@/components/ui/Avatar";
import { TaskCardHeader } from "@/components/task/TaskCardHeader";
import { DueBadge } from "@/components/task/DueBadge";
import { swapApprovalBlocker } from "@/lib/rules";
import { ProofView } from "@/components/task/ProofView";
import { REJECT_REASON_MAX, validateRejectReason } from "@/lib/validation";

export default function ReviewPage() {
  const {
    tasks,
    swaps,
    role,
    currentUser,
    members,
    memberName,
    switchableAccounts,
    setCurrentUser,
    getTask,
    acceptTask,
    rejectTask,
    resolveSwap,
  } = useStore();
  const now = useNow();
  const [rejectTaskId, setRejectTaskId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  if (role !== "leader") {
    const leader = members.find((m) => m.role === "leader");
    // Only the demo lets you become someone else.
    const canSwitchToLeader = leader && switchableAccounts.some((a) => a.id === leader.id);
    return (
      <Card className="flex flex-col items-start gap-4 lg:max-w-[560px]">
        <ShieldCheck size={28} strokeWidth={2} aria-hidden="true" className="text-accent-600" />
        <Notice>
          Only the group leader reviews work and decides swaps. {leader?.name ?? "Nobody"} leads
          this group, and you&apos;re signed in as {memberName(currentUser)}.
        </Notice>
        {canSwitchToLeader && (
          <Button variant="secondary" onClick={() => setCurrentUser(leader.id)}>
            View as {leader.name}
          </Button>
        )}
      </Card>
    );
  }

  const submittedTasks = tasks.filter((t) => t.status === "submitted");
  const pendingSwaps = swaps.filter((s) => s.status === "pending");
  const rejectTaskObj = rejectTaskId != null ? getTask(rejectTaskId) : null;

  function openReject(id: number) {
    setRejectTaskId(id);
    setReason("");
  }

  function confirmReject() {
    if (rejectTaskId == null) return;
    const result = validateRejectReason(reason);
    if (!result.ok) return;
    rejectTask(rejectTaskId, result.value);
    setRejectTaskId(null);
    setReason("");
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="submissions-heading">
        <SectionHeading id="submissions-heading" count={submittedTasks.length}>
          Submissions
        </SectionHeading>
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-4">
          {submittedTasks.map((t) => (
            <Card key={t.id} elevated>
              <TaskCardHeader
                title={t.title}
                meta={
                  <>
                    {t.assignee && <Person name={memberName(t.assignee)} />}
                    <DueBadge deadlineAt={t.deadlineAt} now={now} status={t.status} />
                  </>
                }
                tag={<Tag variant="accent">Submitted</Tag>}
              />
              <div className="mt-3 rounded-[var(--radius-base)] bg-bg/70 px-3 py-2.5">
                <ProofView proof={t.proof} />
              </div>
              {t.assignee === currentUser && (
                <div className="mt-2 text-xs text-neutral-700">
                  Your own task. The shared log will say you reviewed it yourself.
                </div>
              )}
              <div className="mt-3.5 flex gap-2.5">
                {/* aria-label gives each button a unique name for screen readers. */}
                <Button
                  variant="primary"
                  className="flex-1"
                  aria-label={`Accept ${t.title}`}
                  onClick={() => acceptTask(t.id)}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  aria-label={`Reject ${t.title}`}
                  onClick={() => openReject(t.id)}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
          {submittedTasks.length === 0 && <Notice>Nothing to review right now.</Notice>}
        </div>
      </section>

      <section aria-labelledby="swaps-heading">
        <SectionHeading id="swaps-heading" count={pendingSwaps.length}>
          Swap requests
        </SectionHeading>
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-4">
          {pendingSwaps.map((s) => {
            const t = getTask(s.taskId);
            const blocker = swapApprovalBlocker(s, t, now);
            const ask =
              s.mode === "targeted"
                ? `${memberName(s.from)} wants to hand this to ${memberName(s.target)}.`
                : `${memberName(s.from)} wants to release this back to the pool.`;
            return (
              <Card key={s.id} elevated>
                <TaskCardHeader
                  title={t?.title ?? "Task no longer exists"}
                  meta={t && <DueBadge deadlineAt={t.deadlineAt} now={now} status={t.status} />}
                  tag={<Tag variant="outline">Swap</Tag>}
                />
                <div
                  aria-hidden="true"
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-text"
                >
                  <Person name={memberName(s.from)} />
                  <ArrowRight size={16} strokeWidth={2.5} className="text-neutral-600" />
                  {s.mode === "targeted" && s.target ? (
                    <Person name={memberName(s.target)} />
                  ) : (
                    <span className="text-xs font-medium text-neutral-700">Back to the pool</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-neutral-800">{ask}</p>
                {blocker && (
                  <p className="mt-2 rounded-[var(--radius-base)] bg-danger-100 px-3 py-2 text-sm text-danger-700">
                    Can&apos;t approve: {blocker}
                  </p>
                )}
                <div className="mt-3.5 flex gap-2.5">
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={blocker != null}
                    aria-label={`Approve swap for ${t?.title}`}
                    onClick={() => resolveSwap(s.id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    aria-label={`Deny swap for ${t?.title}`}
                    onClick={() => resolveSwap(s.id, false)}
                  >
                    Deny
                  </Button>
                </div>
              </Card>
            );
          })}
          {pendingSwaps.length === 0 && <Notice>No swap requests waiting.</Notice>}
        </div>
      </section>

      {rejectTaskObj && (
        <Dialog
          title="Reject submission"
          onClose={() => setRejectTaskId(null)}
          actions={
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setRejectTaskId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={!reason.trim()}
                onClick={confirmReject}
              >
                Confirm reject
              </Button>
            </>
          }
        >
          <p className="mb-3">
            A reason is required so {memberName(rejectTaskObj.assignee)} knows what to fix.
          </p>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="reject-reason">Reason</FieldLabel>
            <textarea
              id="reject-reason"
              autoFocus
              rows={3}
              placeholder="What needs to change?"
              maxLength={REJECT_REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${FIELD_CONTROL} bg-bg`}
            />
            <div className="text-right text-[11px] text-neutral-700">
              {reason.length}/{REJECT_REASON_MAX}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Person({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
      <Avatar name={name} size="sm" />
      <span>{name}</span>
    </span>
  );
}
