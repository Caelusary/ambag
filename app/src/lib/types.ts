import { HOUR_MS } from "./constants";

export type TaskStatus = "open" | "assigned" | "seen" | "submitted" | "accepted" | "rejected";

export type ProofType = "file" | "link" | "text";

/** "targeted" hands the task to a named teammate; "release" returns it to the pool. */
export type SwapMode = "targeted" | "release";

export type Role = "leader" | "member";

/** Someone in the group. `id` is what tasks and swaps point at; `name` is only for display. */
export interface Member {
  id: string;
  name: string;
  role: Role;
}

export interface Proof {
  type: ProofType;
  /** The link, the note, or the file's name. */
  value: string;
  /**
   * File proofs only: where to download it. An object URL in the demo, a short-lived signed URL
   * from private storage for a real group.
   */
  url?: string;
}

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  /** A member id. */
  assignee: string | null;
  deadlineAt: number;
  proof: Proof | null;
  /** When the current proof went in. On time or late is judged by this, not by when it was reviewed. */
  submittedAt: number | null;
  rejectReason: string | null;
  swapPending: boolean;
}

export interface SwapRequest {
  id: number;
  taskId: number;
  /** Member ids, like Task.assignee. */
  from: string;
  mode: SwapMode;
  /** The teammate who takes the task; null for a release back to the pool. */
  target: string | null;
  status: "pending" | "approved" | "denied";
  ts: number;
}

export interface ShareLink {
  token: string;
  createdAt: number;
  revokedAt: number | null;
}

export interface LogEntry {
  id: number;
  ts: number;
  text: string;
}

export interface LedgerRow {
  id: string;
  name: string;
  onTime: number;
  late: number;
  overdue: number;
  swaps: number;
}

export interface StatusMeta {
  label: string;
  tagClass: "outline" | "neutral" | "accent" | "accent-2" | "danger";
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
      return { label: "Rejected", tagClass: "danger" };
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
  const hours = Math.round(diffMs / HOUR_MS);
  if (hours < 0) {
    const overdueHours = Math.abs(hours);
    if (overdueHours < 48) return `overdue by ${overdueHours}h`;
    return `overdue by ${Math.round(overdueHours / 24)}d`;
  }
  if (hours === 0) return "due now";
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export function statusRank(status: TaskStatus): number {
  return { open: 0, assigned: 1, seen: 2, submitted: 3, accepted: 4, rejected: 0 }[status];
}
