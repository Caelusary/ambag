"use client";

import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/clock";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { formatDeadline, proofSummary, statusLabel, statusMeta, statusRank } from "@/lib/types";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { tasks, currentUser, claimTask } = useStore();
  const id = Number(params.id);
  const task = tasks.find((t) => t.id === id);
  const now = useNow();

  if (!task) {
    return <div className="text-sm text-neutral-700">This task no longer exists.</div>;
  }

  const isMine = task.assignee === currentUser;
  const canClaim = task.status === "open";
  const canSubmitProof =
    isMine && (task.status === "assigned" || task.status === "seen" || task.status === "rejected");
  const canRequestSwap =
    isMine && (task.status === "assigned" || task.status === "seen") && !task.swapPending;
  const waitingReview = task.status === "submitted";
  const isAccepted = task.status === "accepted";
  const showStepper = task.status !== "open" && task.status !== "rejected";

  return (
    <div>
      <Card elevated className="mb-[18px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 font-heading text-[17px] text-text">{task.title}</div>
          <Tag variant={statusMeta(task.status).tagClass}>{statusLabel(task)}</Tag>
        </div>
        <div className="mt-1.5 text-[13px] text-neutral-700">
          Assignee: {task.assignee ?? "Unclaimed"}
        </div>
        <div className="text-[13px] text-neutral-700">Due {formatDeadline(task.deadlineAt, now)}</div>
      </Card>

      {showStepper && <Stepper rank={statusRank(task.status)} />}

      {task.status === "rejected" && task.rejectReason && (
        <Card bordered className="mb-[18px]">
          <div className="mb-1 text-[13px] font-bold text-accent-700">Rejected — reason</div>
          <div className="text-sm text-text">{task.rejectReason}</div>
        </Card>
      )}

      {task.proof && (
        <Card className="mb-[18px]">
          <div className="mb-1 text-[13px] font-bold text-neutral-700">Submitted proof</div>
          <div className="text-sm text-text">{proofSummary(task.proof)}</div>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {canClaim && (
          <Button block onClick={() => claimTask(task.id)}>
            Call dibs
          </Button>
        )}
        {canSubmitProof && (
          <Button block onClick={() => router.push(`/task/${task.id}/proof`)}>
            {task.status === "rejected" ? "Resubmit proof" : "Submit proof"}
          </Button>
        )}
        {canRequestSwap && (
          <Button block variant="secondary" onClick={() => router.push(`/task/${task.id}/swap`)}>
            Request swap
          </Button>
        )}
        {waitingReview && (
          <div className="py-2 text-center text-[13px] text-neutral-700">
            Waiting for leader review.
          </div>
        )}
        {isAccepted && (
          <div className="py-2 text-center text-[13px] font-semibold text-accent-2-800">
            Accepted — nice work.
          </div>
        )}
      </div>
    </div>
  );
}
