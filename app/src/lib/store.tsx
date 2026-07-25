"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { EPOCH } from "./clock";
import type { LedgerRow, LogEntry, Proof, Task } from "./types";

const HOUR = 1000 * 60 * 60;

const CURRENT_USER = "Jamie";
const MEMBERS = ["Maya", "Jordan", "Priya", "Sam", "Alex"];

function seedTasks(now: number): Task[] {
  return [
    { id: 1, title: "Design cover slide", status: "open", assignee: null, deadlineAt: now + 144 * HOUR, proof: null, rejectReason: null, swapPending: false },
    { id: 2, title: "Write intro paragraph", status: "assigned", assignee: "Maya", deadlineAt: now + 96 * HOUR, proof: null, rejectReason: null, swapPending: false },
    { id: 3, title: "Collect survey data", status: "seen", assignee: "Jordan", deadlineAt: now + 70 * HOUR, proof: null, rejectReason: null, swapPending: false },
    { id: 4, title: "Edit final video", status: "submitted", assignee: "Priya", deadlineAt: now + 20 * HOUR, proof: { type: "link", value: "drive.google.com/final-video" }, rejectReason: null, swapPending: false },
    { id: 5, title: "Build slide deck", status: "accepted", assignee: "Sam", deadlineAt: now - 30 * HOUR, proof: { type: "file", value: "slidedeck-final.pdf" }, rejectReason: null, swapPending: false },
    { id: 6, title: "Proofread report", status: "rejected", assignee: "Alex", deadlineAt: now - 6 * HOUR, proof: { type: "text", value: "Read through and fixed typos in sections 1-4." }, rejectReason: "Missing citations for sources 3 and 7", swapPending: false },
    { id: 7, title: "Record voiceover", status: "assigned", assignee: "Jamie", deadlineAt: now + 30 * HOUR, proof: null, rejectReason: null, swapPending: false },
    { id: 8, title: "Format bibliography", status: "assigned", assignee: "Jamie", deadlineAt: now + 96 * HOUR, proof: null, rejectReason: null, swapPending: false },
    { id: 9, title: "Interview stakeholder", status: "open", assignee: null, deadlineAt: now + 192 * HOUR, proof: null, rejectReason: null, swapPending: false },
  ];
}

function seedLog(now: number): LogEntry[] {
  return [
    { id: 4, ts: now - 2 * HOUR, text: 'Priya submitted proof for "Edit final video"' },
    { id: 3, ts: now - 26 * HOUR, text: 'Maya rejected "Proofread report" — Missing citations for sources 3 and 7' },
    { id: 2, ts: now - 50 * HOUR, text: 'Maya accepted "Build slide deck" — on time' },
    { id: 1, ts: now - 52 * HOUR, text: 'Sam submitted proof for "Build slide deck"' },
  ];
}

const LEDGER: LedgerRow[] = [
  { name: "Jamie", onTime: 5, late: 1, overdue: 0, swaps: 1 },
  { name: "Maya", onTime: 6, late: 0, overdue: 0, swaps: 0 },
  { name: "Jordan", onTime: 3, late: 2, overdue: 1, swaps: 0 },
  { name: "Priya", onTime: 4, late: 1, overdue: 0, swaps: 2 },
  { name: "Sam", onTime: 5, late: 0, overdue: 0, swaps: 1 },
  { name: "Alex", onTime: 2, late: 1, overdue: 1, swaps: 0 },
];

interface StoreValue {
  currentUser: string;
  members: string[];
  tasks: Task[];
  log: LogEntry[];
  ledger: LedgerRow[];
  getTask: (id: number) => Task | undefined;
  claimTask: (id: number) => void;
  markSeen: (id: number) => void;
  submitProof: (id: number, proof: Proof) => void;
  acceptTask: (id: number) => void;
  rejectTask: (id: number, reason: string) => void;
  sendSwapRequest: (id: number, mode: "targeted" | "release", target: string | null) => void;
  resolveSwap: (id: number, approve: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => seedTasks(EPOCH));
  const [log, setLog] = useState<LogEntry[]>(() => seedLog(EPOCH));

  // Offset between the wall clock and the demo epoch, so new log entries land on
  // the same timeline as the seeded ones.
  const skewRef = useRef(0);
  useEffect(() => {
    skewRef.current = Date.now() - EPOCH;
  }, []);

  // Event handlers run outside render, so reading the wall clock here is safe.
  const appendLog = useCallback((text: string) => {
    const ts = Date.now() - skewRef.current;
    setLog((prev) => [{ id: prev.length + 1000, ts, text }, ...prev]);
  }, []);

  const getTask = useCallback((id: number) => tasks.find((t) => t.id === id), [tasks]);

  const claimTask = useCallback(
    (id: number) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "assigned", assignee: CURRENT_USER } : t))
      );
      appendLog(`${CURRENT_USER} called dibs on "${task.title}"`);
    },
    [tasks, appendLog]
  );

  const markSeen = useCallback((id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id && t.status === "assigned" ? { ...t, status: "seen" } : t))
    );
  }, []);

  const submitProof = useCallback(
    (id: number, proof: Proof) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "submitted", proof, rejectReason: null } : t))
      );
      appendLog(`${CURRENT_USER} submitted proof for "${task.title}"`);
    },
    [tasks, appendLog]
  );

  const acceptTask = useCallback(
    (id: number) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "accepted" } : t)));
      appendLog(`Leader accepted "${task.title}" — ${task.assignee} on time`);
    },
    [tasks, appendLog]
  );

  const rejectTask = useCallback(
    (id: number, reason: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || !reason.trim()) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "rejected", rejectReason: reason } : t))
      );
      appendLog(`Leader rejected "${task.title}" — ${reason}`);
    },
    [tasks, appendLog]
  );

  const sendSwapRequest = useCallback(
    (id: number, mode: "targeted" | "release", target: string | null) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, swapPending: true } : t)));
      const desc =
        mode === "targeted"
          ? `${CURRENT_USER} requested a swap with ${target} for "${task.title}"`
          : `${CURRENT_USER} released "${task.title}" back to the pool`;
      appendLog(desc);
    },
    [tasks, appendLog]
  );

  const resolveSwap = useCallback(
    (id: number, approve: boolean) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, swapPending: false } : t)));
      appendLog(
        approve
          ? `Leader approved the swap for "${task.title}"`
          : `Leader denied the swap for "${task.title}"`
      );
    },
    [tasks, appendLog]
  );

  const value: StoreValue = {
    currentUser: CURRENT_USER,
    members: MEMBERS,
    tasks,
    log,
    ledger: LEDGER,
    getTask,
    claimTask,
    markSeen,
    submitProof,
    acceptTask,
    rejectTask,
    sendSwapRequest,
    resolveSwap,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
