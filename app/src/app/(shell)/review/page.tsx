"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/clock";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatDeadline, proofSummary } from "@/lib/types";

export default function ReviewPage() {
  const { tasks, acceptTask, rejectTask } = useStore();
  const now = useNow();
  const submittedTasks = tasks.filter((t) => t.status === "submitted");
  const [rejectTaskId, setRejectTaskId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const rejectTaskObj = rejectTaskId != null ? tasks.find((t) => t.id === rejectTaskId) : null;

  function openReject(id: number) {
    setRejectTaskId(id);
    setReason("");
  }

  function confirmReject() {
    if (rejectTaskId == null || !reason.trim()) return;
    rejectTask(rejectTaskId, reason.trim());
    setRejectTaskId(null);
    setReason("");
  }

  return (
    <div className="relative flex flex-col gap-3.5">
      <div className="text-[13px] text-neutral-700">Submissions waiting for a decision.</div>

      {submittedTasks.map((t) => (
        <Card key={t.id} elevated>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-heading text-[17px] text-text">{t.title}</div>
              <div className="mt-0.5 text-[11px] text-neutral-700">
                {t.assignee} · Due {formatDeadline(t.deadlineAt, now)}
              </div>
            </div>
            <Tag variant="accent">Submitted</Tag>
          </div>
          <div className="mt-2 text-sm text-text">{proofSummary(t.proof)}</div>
          <div className="mt-3.5 flex gap-2.5">
            <Button variant="primary" className="flex-1" onClick={() => acceptTask(t.id)}>
              Accept
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => openReject(t.id)}>
              Reject
            </Button>
          </div>
        </Card>
      ))}

      {submittedTasks.length === 0 && (
        <div className="text-sm text-neutral-700">Nothing to review right now.</div>
      )}

      {rejectTaskObj && (
        <Dialog
          title="Reject submission"
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
            A reason is required so {rejectTaskObj.assignee} knows what to fix.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-700">Reason</label>
            <textarea
              autoFocus
              rows={3}
              placeholder="What needs to change?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-[var(--radius-base)] border border-neutral-300 bg-bg p-3 text-sm text-text outline-none focus:border-accent-500"
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
