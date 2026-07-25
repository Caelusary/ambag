export type TaskStatus =
  | "open"
  | "assigned"
  | "seen"
  | "submitted"
  | "accepted"
  | "rejected";

export type ProofType = "file" | "link" | "text";

export interface Proof {
  type: ProofType;
  value: string;
}

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  assignee: string | null;
  deadlineAt: number;
  proof: Proof | null;
  rejectReason: string | null;
  swapPending: boolean;
}

export interface LogEntry {
  id: number;
  ts: number;
  text: string;
}

export interface LedgerRow {
  name: string;
  onTime: number;
  late: number;
  overdue: number;
  swaps: number;
}

export interface StatusMeta {
  label: string;
  tagClass: "outline" | "neutral" | "accent" | "accent-2";
}

export function statusMeta(status: TaskStatus): StatusMeta {
  switch (status) {
    case "open":
      return { label: "Open", tagClass: "outline" };
    case "assigned":
      return { label: "Assigned", tagClass: "neutral" };
    case "seen":
      return { label: "Seen", tagClass: "accent-2" };
    case "submitted":
      return { label: "Submitted", tagClass: "accent" };
    case "accepted":
      return { label: "Accepted", tagClass: "accent-2" };
    case "rejected":
      return { label: "Rejected", tagClass: "outline" };
  }
}

export function statusLabel(task: Task): string {
  const { label } = statusMeta(task.status);
  return task.swapPending ? `${label} · Swap pending` : label;
}

export function proofSummary(proof: Proof | null): string {
  if (!proof) return "";
  if (proof.type === "link") return `Link: ${proof.value}`;
  if (proof.type === "file") return `File: ${proof.value}`;
  return `Note: ${proof.value}`;
}

export function formatDeadline(deadlineAt: number, now: number): string {
  const diffMs = deadlineAt - now;
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 0) {
    const overdueHours = Math.abs(hours);
    if (overdueHours < 48) return `overdue by ${overdueHours}h`;
    return `overdue by ${Math.round(overdueHours / 24)}d`;
  }
  if (hours === 0) return "due now";
  if (hours < 48) return `in ${hours} hours`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export function hoursUntil(deadlineAt: number, now: number): number {
  return (deadlineAt - now) / (1000 * 60 * 60);
}

export const STEP_LABELS = ["Assigned", "Seen", "Submitted", "Accepted"] as const;

export function statusRank(status: TaskStatus): number {
  return { open: 0, assigned: 1, seen: 2, submitted: 3, accepted: 4, rejected: 0 }[status];
}
