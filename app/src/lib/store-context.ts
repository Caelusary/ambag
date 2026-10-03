"use client";

import { createContext, useContext } from "react";
import type {
  LogEntry,
  Member,
  Proof,
  Role,
  ShareLink,
  SwapMode,
  SwapRequest,
  Task,
} from "./types";

/**
 * What every page reads and calls. Two providers implement it: the demo store in store.tsx keeps
 * everything in memory, and the live store in live-store.tsx talks to Supabase. Pages can't tell
 * them apart, so neither knows how the other is built.
 */
export interface StoreValue {
  /** The signed-in member's id. */
  currentUser: string;
  role: Role;
  /** Accounts the viewer may switch between. Only the demo has any. */
  switchableAccounts: Member[];
  setCurrentUser: (id: string) => void;
  members: Member[];
  /** A member's display name, or "Someone" for an id that has left the group. */
  memberName: (id: string | null) => string;
  tasks: Task[];
  log: LogEntry[];
  swaps: SwapRequest[];
  shareLinks: ShareLink[];
  /** The last action the server refused, worded for the viewer. */
  error: string | null;
  clearError: () => void;
  getTask: (id: number) => Task | undefined;
  createTask: (title: string, deadlineAt: number) => void;
  claimTask: (id: number) => void;
  markSeen: (id: number) => void;
  /** `file` is the picked File for a real group, which uploads it before submitting. */
  submitProof: (id: number, proof: Proof, file?: File) => void;
  acceptTask: (id: number) => void;
  rejectTask: (id: number, reason: string) => void;
  sendSwapRequest: (id: number, mode: SwapMode, target: string | null) => void;
  resolveSwap: (requestId: number, approve: boolean) => void;
  createShareLink: () => void;
  revokeShareLink: (token: string) => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a store provider");
  return ctx;
}

/** Looks a name up in a roster. */
export function nameIn(members: Member[], id: string | null): string {
  if (id == null) return "Nobody";
  return members.find((m) => m.id === id)?.name ?? "Someone";
}
