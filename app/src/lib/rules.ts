import { HOUR_MS, SWAP_CUTOFF_HOURS } from "./constants";
import type { LedgerRow, Member, Role, SwapRequest, Task } from "./types";

/**
 * Every rule about who may do what, in one place. The pages use these to decide what to show,
 * and the store checks them again before changing anything. A backend must enforce the same
 * rules (see "Backend contract" in the README); these are the client half.
 */

export function canClaim(task: Task): boolean {
  return task.status === "open";
}

export function canSubmitProof(task: Task, user: string): boolean {
  return (
    task.assignee === user &&
    (task.status === "assigned" || task.status === "seen" || task.status === "rejected")
  );
}

export function canRequestSwap(task: Task, user: string): boolean {
  return (
    task.assignee === user &&
    (task.status === "assigned" || task.status === "seen") &&
    !task.swapPending
  );
}

export function isInsideSwapCutoff(task: Task, now: number): boolean {
  return (task.deadlineAt - now) / HOUR_MS < SWAP_CUTOFF_HOURS;
}

/** Only the leader reviews work, and only work that is waiting for review. */
export function canReview(task: Task, role: Role): boolean {
  return role === "leader" && task.status === "submitted";
}

/**
 * Why a pending swap can't be approved right now, or null if it can. A request can go stale:
 * the requester may have submitted proof since, or the deadline may have moved inside the cutoff,
 * and approving then would hand someone a half-done or last-minute task.
 */
export function swapApprovalBlocker(
  request: SwapRequest,
  task: Task | undefined,
  now: number,
): string | null {
  if (request.status !== "pending") return "This request was already decided.";
  if (!task || task.assignee !== request.from) return "The task has changed hands since.";
  if (task.status !== "assigned" && task.status !== "seen") {
    return "The task has moved on since this was requested.";
  }
  if (isInsideSwapCutoff(task, now)) {
    return `The deadline is now under ${SWAP_CUTOFF_HOURS} hours away.`;
  }
  return null;
}

/**
 * The ledger, computed from what actually happened rather than stored:
 * - on time / late: accepted work, judged by when the proof went in against the deadline;
 * - overdue: work still on someone's plate (not submitted or accepted) past its deadline;
 * - swaps: swap requests that person made, whatever their outcome.
 */
export function computeLedger(
  members: Member[],
  tasks: Task[],
  swaps: SwapRequest[],
  now: number,
): LedgerRow[] {
  return members.map(({ id, name }) => {
    const theirs = tasks.filter((t) => t.assignee === id);
    const accepted = theirs.filter((t) => t.status === "accepted" && t.submittedAt != null);
    return {
      id,
      name,
      onTime: accepted.filter((t) => t.submittedAt! <= t.deadlineAt).length,
      late: accepted.filter((t) => t.submittedAt! > t.deadlineAt).length,
      overdue: theirs.filter(
        (t) =>
          (t.status === "assigned" || t.status === "seen" || t.status === "rejected") &&
          t.deadlineAt < now,
      ).length,
      swaps: swaps.filter((s) => s.from === id).length,
    };
  });
}
