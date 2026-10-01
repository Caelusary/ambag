"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useRouteTask } from "@/lib/useRouteTask";
import { useNow } from "@/lib/clock";
import { TaskNotFound } from "@/components/task/TaskNotFound";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { Avatar } from "@/components/ui/Avatar";
import { DueBadge } from "@/components/task/DueBadge";
import { ProofView } from "@/components/task/ProofView";
import { canClaim, canRequestSwap, canSubmitProof, isInsideSwapCutoff } from "@/lib/rules";
import { statusLabel, statusMeta, statusRank } from "@/lib/types";
import { SWAP_CUTOFF_HOURS } from "@/lib/constants";

export default function TaskDetailPage() {
  const router = useRouter();
  const { currentUser, claimTask, markSeen } = useStore();
  const { id, task } = useRouteTask();
  const now = useNow();

  // Opening your own assigned task is what moves it to "Seen" on the stepper.
  const assignee = task?.assignee;
  const status = task?.status;
  useEffect(() => {
    if (assignee === currentUser && status === "assigned") markSeen(id);
  }, [assignee, status, currentUser, id, markSeen]);

  if (!task) return <TaskNotFound />;

  const showClaim = canClaim(task);
  const showSubmitProof = canSubmitProof(task, currentUser);
  // Inside the cutoff the swap page would only say no, so say it here instead of linking to it.
  const swapAllowed = canRequestSwap(task, currentUser);
  const swapClosed = swapAllowed && isInsideSwapCutoff(task, now);
  const showRequestSwap = swapAllowed && !swapClosed;
  const waitingReview = task.status === "submitted";
  const isAccepted = task.status === "accepted";
  const showStepper = task.status !== "open" && task.status !== "rejected";
  const hasNextStep =
    showClaim || swapClosed || showSubmitProof || showRequestSwap || waitingReview || isAccepted;

  // Desktop: the task's record on the left, what you can do with it in a sticky column on the right.
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
      <div>
        <Card elevated className="mb-5 lg:p-6">
          <section aria-label="Task summary">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 font-heading text-[22px] leading-tight text-text lg:text-[26px]">
                {task.title}
              </h2>
              <Tag variant={statusMeta(task.status).tagClass}>{statusLabel(task)}</Tag>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4 text-sm">
              <div>
                <dt className="text-xs text-neutral-700">Assignee</dt>
                <dd className="mt-1.5 flex items-center gap-2 font-semibold text-text">
                  {task.assignee ? (
                    <>
                      <Avatar name={task.assignee} size="sm" />
                      <span>{task.assignee}</span>
                    </>
                  ) : (
                    <span className="font-medium text-neutral-700">Unclaimed</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-700">Deadline</dt>
                <dd className="mt-1.5">
                  <DueBadge deadlineAt={task.deadlineAt} now={now} status={task.status} />
                </dd>
              </div>
            </dl>
          </section>
        </Card>

        {showStepper && (
          <Card className="mb-5 px-3 pt-5 pb-0 lg:px-6">
            <Stepper rank={statusRank(task.status)} />
          </Card>
        )}

        {task.status === "rejected" && task.rejectReason && (
          <Card bordered className="mb-5 bg-danger-100/50">
            <div className="mb-1 text-[13px] font-bold text-danger-700">Why it was rejected</div>
            <div className="text-sm text-text">{task.rejectReason}</div>
          </Card>
        )}

        {task.proof && (
          <Card className="mb-5">
            <div className="mb-1.5 text-[13px] font-bold text-neutral-800">Submitted proof</div>
            <ProofView proof={task.proof} />
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2.5 lg:sticky lg:top-32 lg:rounded-[var(--radius-card)] lg:border lg:border-neutral-200 lg:bg-surface lg:p-5 lg:shadow-sm">
        <h2 className="hidden font-heading text-[17px] text-text lg:block">Next step</h2>
        {showClaim && (
          <Button block onClick={() => claimTask(task.id)}>
            Call dibs
          </Button>
        )}
        {showSubmitProof && (
          <Button block onClick={() => router.push(`/task/${task.id}/proof`)}>
            {task.status === "rejected" ? "Resubmit proof" : "Submit proof"}
          </Button>
        )}
        {showRequestSwap && (
          <Button block variant="secondary" onClick={() => router.push(`/task/${task.id}/swap`)}>
            Request swap
          </Button>
        )}
        {swapClosed && (
          <div className="py-2 text-center text-[13px] text-neutral-700 lg:text-left">
            Swaps are closed: this is due in under {SWAP_CUTOFF_HOURS} hours.
          </div>
        )}
        {waitingReview && (
          <div className="py-2 text-center text-[13px] text-neutral-700 lg:text-left">
            Waiting for leader review.
          </div>
        )}
        {isAccepted && (
          <div className="rounded-[var(--radius-base)] bg-accent-2-100 px-3 py-2.5 text-center text-[13px] font-semibold text-accent-2-800 lg:text-left">
            Accepted. Nice work.
          </div>
        )}
        {!hasNextStep && (
          <div className="py-2 text-center text-[13px] text-neutral-700 lg:text-left">
            Nothing for you to do here. This task belongs to {task.assignee}.
          </div>
        )}
      </div>
    </div>
  );
}
