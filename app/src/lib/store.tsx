"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EPOCH } from "./clock";
import { HOUR_MS as HOUR } from "./constants";
import { canClaim, canRequestSwap, canReview, canSubmitProof, swapApprovalBlocker } from "./rules";
import { StoreContext, nameIn, type StoreValue } from "./store-context";
import type { LogEntry, Member, Proof, ShareLink, SwapMode, SwapRequest, Task } from "./types";

export { useStore } from "./store-context";

/**
 * The demo group, kept entirely in memory. Maya leads it; everyone else is a member. Demo ids are
 * the names themselves, which only works because nobody here shares a name.
 */
export const LEADER = "Maya";
export const MEMBERS = ["Jamie", "Maya", "Jordan", "Priya", "Sam", "Alex"];
const DEMO_MEMBERS: Member[] = MEMBERS.map((name) => ({
  id: name,
  name,
  role: name === LEADER ? "leader" : "member",
}));

/** The accounts the demo lets you switch between: one member, and the leader. */
const DEMO_ACCOUNTS = DEMO_MEMBERS.filter((m) => m.id === "Jamie" || m.id === LEADER);

/** A share link that exists from the start, so /s/demo works without creating one first. */
export const DEMO_SHARE_TOKEN = "demo";

function task(fields: Partial<Task> & Pick<Task, "id" | "title" | "deadlineAt">): Task {
  return {
    status: "open",
    assignee: null,
    proof: null,
    submittedAt: null,
    rejectReason: null,
    swapPending: false,
    ...fields,
  };
}

function seedTasks(now: number): Task[] {
  return [
    task({ id: 1, title: "Design cover slide", deadlineAt: now + 144 * HOUR }),
    task({
      id: 2,
      title: "Write intro paragraph",
      status: "assigned",
      assignee: "Maya",
      deadlineAt: now + 96 * HOUR,
    }),
    task({
      id: 3,
      title: "Collect survey data",
      status: "seen",
      assignee: "Jordan",
      deadlineAt: now + 70 * HOUR,
    }),
    task({
      id: 4,
      title: "Edit final video",
      status: "submitted",
      assignee: "Priya",
      deadlineAt: now + 20 * HOUR,
      proof: { type: "link", value: "drive.google.com/final-video" },
      submittedAt: now - 2 * HOUR,
    }),
    task({
      id: 5,
      title: "Build slide deck",
      status: "accepted",
      assignee: "Sam",
      deadlineAt: now - 30 * HOUR,
      proof: { type: "file", value: "slidedeck-final.pdf" },
      submittedAt: now - 52 * HOUR,
    }),
    task({
      id: 6,
      title: "Proofread report",
      status: "rejected",
      assignee: "Alex",
      deadlineAt: now - 6 * HOUR,
      proof: { type: "text", value: "Read through and fixed typos in sections 1-4." },
      submittedAt: now - 28 * HOUR,
      rejectReason: "Missing citations for sources 3 and 7",
    }),
    task({
      id: 7,
      title: "Record voiceover",
      status: "assigned",
      assignee: "Jamie",
      deadlineAt: now + 30 * HOUR,
    }),
    task({
      id: 8,
      title: "Format bibliography",
      status: "assigned",
      assignee: "Jamie",
      deadlineAt: now + 96 * HOUR,
    }),
    task({ id: 9, title: "Interview stakeholder", deadlineAt: now + 192 * HOUR }),
    // Finished earlier in the project, so the ledger has history to show.
    task({
      id: 10,
      title: "Draft project outline",
      status: "accepted",
      assignee: "Jamie",
      deadlineAt: now - 100 * HOUR,
      proof: { type: "link", value: "docs.google.com/outline" },
      submittedAt: now - 120 * HOUR,
    }),
    task({
      id: 11,
      title: "Gather sources",
      status: "accepted",
      assignee: "Jordan",
      deadlineAt: now - 90 * HOUR,
      proof: { type: "text", value: "Twelve sources, annotated in the shared doc." },
      submittedAt: now - 80 * HOUR,
    }),
    task({
      id: 12,
      title: "Pick colour palette",
      status: "accepted",
      assignee: "Priya",
      deadlineAt: now - 130 * HOUR,
      proof: { type: "file", value: "palette.png" },
      submittedAt: now - 140 * HOUR,
    }),
  ];
}

function seedLog(now: number): LogEntry[] {
  return [
    { id: 9, ts: now - 2 * HOUR, text: 'Priya submitted proof for "Edit final video"' },
    {
      id: 8,
      ts: now - 26 * HOUR,
      text: 'Maya rejected "Proofread report": Missing citations for sources 3 and 7',
    },
    { id: 7, ts: now - 28 * HOUR, text: 'Alex submitted proof for "Proofread report"' },
    { id: 6, ts: now - 50 * HOUR, text: 'Maya accepted "Build slide deck" (Sam, on time)' },
    { id: 5, ts: now - 52 * HOUR, text: 'Sam submitted proof for "Build slide deck"' },
    { id: 4, ts: now - 78 * HOUR, text: 'Maya accepted "Gather sources" (Jordan, late)' },
    { id: 3, ts: now - 80 * HOUR, text: 'Jordan submitted proof for "Gather sources"' },
    { id: 2, ts: now - 118 * HOUR, text: 'Maya accepted "Draft project outline" (Jamie, on time)' },
    { id: 1, ts: now - 138 * HOUR, text: 'Maya accepted "Pick colour palette" (Priya, on time)' },
  ];
}

/** 128 random bits, base64url: unguessable, unlike an id or a counter. */
function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState("Jamie");
  const [tasks, setTasks] = useState<Task[]>(() => seedTasks(EPOCH));
  const [log, setLog] = useState<LogEntry[]>(() => seedLog(EPOCH));
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(() => [
    { token: DEMO_SHARE_TOKEN, createdAt: EPOCH - 48 * HOUR, revokedAt: null },
  ]);
  const role = currentUser === LEADER ? "leader" : "member";
  const memberName = useCallback((id: string | null) => nameIn(DEMO_MEMBERS, id), []);

  // Offset between the wall clock and the demo epoch, so new entries land on the same
  // timeline as the seeded ones.
  const skewRef = useRef(0);
  useEffect(() => {
    skewRef.current = Date.now() - EPOCH;
  }, []);

  // Event handlers run outside render, so reading the wall clock here is safe.
  const demoNow = useCallback(() => Date.now() - skewRef.current, []);

  const appendLog = useCallback(
    (text: string) => {
      const ts = demoNow();
      setLog((prev) => [{ id: prev.length + 1000, ts, text }, ...prev]);
    },
    [demoNow],
  );

  const setCurrentUser = useCallback((id: string) => {
    if (DEMO_ACCOUNTS.some((a) => a.id === id)) setCurrentUserState(id);
  }, []);

  const getTask = useCallback((id: number) => tasks.find((t) => t.id === id), [tasks]);

  // Every action re-checks the rule the page already checked: a double click, a stale tab or a
  // future API caller must not be able to skip it. A backend will need the same checks.

  const createTask = useCallback(
    (title: string, deadlineAt: number) => {
      if (role !== "leader" || !title.trim()) return;
      setTasks((prev) => [
        ...prev,
        task({ id: Math.max(0, ...prev.map((x) => x.id)) + 1, title: title.trim(), deadlineAt }),
      ]);
      appendLog(`${currentUser} added "${title.trim()}"`);
    },
    [role, appendLog, currentUser],
  );

  const claimTask = useCallback(
    (id: number) => {
      const t = getTask(id);
      if (!t || !canClaim(t)) return;
      setTasks((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "assigned", assignee: currentUser } : x)),
      );
      appendLog(`${currentUser} called dibs on "${t.title}"`);
    },
    [getTask, appendLog, currentUser],
  );

  const markSeen = useCallback(
    (id: number) => {
      setTasks((prev) =>
        prev.map((x) =>
          x.id === id && x.status === "assigned" && x.assignee === currentUser
            ? { ...x, status: "seen" }
            : x,
        ),
      );
    },
    [currentUser],
  );

  const submitProof = useCallback(
    (id: number, proof: Proof) => {
      const t = getTask(id);
      if (!t || !canSubmitProof(t, currentUser)) return;
      const submittedAt = demoNow();
      setTasks((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: "submitted", proof, submittedAt, rejectReason: null } : x,
        ),
      );
      appendLog(`${currentUser} submitted proof for "${t.title}"`);
    },
    [getTask, appendLog, currentUser, demoNow],
  );

  const acceptTask = useCallback(
    (id: number) => {
      const t = getTask(id);
      if (!t || !canReview(t, role)) return;
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: "accepted" } : x)));
      // Judged by when the proof went in: a slow review doesn't make someone late.
      const timing = t.submittedAt != null && t.submittedAt <= t.deadlineAt ? "on time" : "late";
      // The leader can only review their own work themselves, so the shared log says so.
      const whose = t.assignee === currentUser ? "their own task" : memberName(t.assignee);
      appendLog(`${currentUser} accepted "${t.title}" (${whose}, ${timing})`);
    },
    [getTask, appendLog, currentUser, role, memberName],
  );

  const rejectTask = useCallback(
    (id: number, reason: string) => {
      const t = getTask(id);
      if (!t || !canReview(t, role) || !reason.trim()) return;
      setTasks((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "rejected", rejectReason: reason } : x)),
      );
      appendLog(`${currentUser} rejected "${t.title}": ${reason}`);
    },
    [getTask, appendLog, currentUser, role],
  );

  const sendSwapRequest = useCallback(
    (id: number, mode: SwapMode, target: string | null) => {
      const t = getTask(id);
      if (!t || !canRequestSwap(t, currentUser)) return;
      if (
        mode === "targeted" &&
        (!target || target === currentUser || !DEMO_MEMBERS.some((m) => m.id === target))
      ) {
        return;
      }
      const ts = demoNow();
      setSwaps((prev) => [
        {
          id: prev.length + 1,
          taskId: id,
          from: currentUser,
          mode,
          target: mode === "targeted" ? target : null,
          status: "pending",
          ts,
        },
        ...prev,
      ]);
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, swapPending: true } : x)));
      appendLog(
        mode === "targeted"
          ? `${currentUser} requested a swap with ${target} for "${t.title}"`
          : `${currentUser} asked to release "${t.title}" back to the pool`,
      );
    },
    [getTask, appendLog, currentUser, demoNow],
  );

  const resolveSwap = useCallback(
    (requestId: number, approve: boolean) => {
      if (role !== "leader") return;
      const request = swaps.find((s) => s.id === requestId);
      if (!request || request.status !== "pending") return;
      const t = getTask(request.taskId);
      if (approve && swapApprovalBlocker(request, t, demoNow())) return;

      setSwaps((prev) =>
        prev.map((s) =>
          s.id === requestId ? { ...s, status: approve ? "approved" : "denied" } : s,
        ),
      );
      setTasks((prev) =>
        prev.map((x) => {
          if (x.id !== request.taskId) return x;
          if (!approve) return { ...x, swapPending: false };
          return request.mode === "targeted"
            ? { ...x, assignee: request.target, status: "assigned", swapPending: false }
            : { ...x, assignee: null, status: "open", swapPending: false };
        }),
      );
      const title = t?.title ?? "a task";
      if (!approve) {
        appendLog(`${currentUser} denied ${request.from}'s swap request for "${title}"`);
      } else if (request.mode === "targeted") {
        appendLog(
          `${currentUser} approved the swap: "${title}" moves from ${request.from} to ${request.target}`,
        );
      } else {
        appendLog(`${currentUser} approved releasing "${title}" back to the pool`);
      }
    },
    [role, swaps, getTask, appendLog, currentUser, demoNow],
  );

  const createShareLink = useCallback(() => {
    if (role !== "leader") return;
    const token = newShareToken();
    setShareLinks((prev) => [{ token, createdAt: demoNow(), revokedAt: null }, ...prev]);
    appendLog(`${currentUser} created a new read-only share link`);
  }, [role, demoNow, appendLog, currentUser]);

  const clearError = useCallback(() => {}, []);

  const revokeShareLink = useCallback(
    (token: string) => {
      if (role !== "leader") return;
      const link = shareLinks.find((l) => l.token === token);
      if (!link || link.revokedAt != null) return;
      setShareLinks((prev) =>
        prev.map((l) => (l.token === token ? { ...l, revokedAt: demoNow() } : l)),
      );
      appendLog(`${currentUser} revoked a read-only share link`);
    },
    [role, shareLinks, demoNow, appendLog, currentUser],
  );

  // Memoised so consumers only re-render when store data actually changes, not
  // whenever the provider's parent happens to re-render.
  const value = useMemo<StoreValue>(
    () => ({
      currentUser,
      role,
      switchableAccounts: DEMO_ACCOUNTS,
      setCurrentUser,
      members: DEMO_MEMBERS,
      memberName,
      tasks,
      log,
      swaps,
      shareLinks,
      // The demo never refuses anything on a server, so there's nothing to report.
      error: null,
      clearError,
      getTask,
      createTask,
      claimTask,
      markSeen,
      submitProof,
      acceptTask,
      rejectTask,
      sendSwapRequest,
      resolveSwap,
      createShareLink,
      revokeShareLink,
    }),
    [
      currentUser,
      role,
      setCurrentUser,
      memberName,
      tasks,
      log,
      swaps,
      shareLinks,
      clearError,
      getTask,
      createTask,
      claimTask,
      markSeen,
      submitProof,
      acceptTask,
      rejectTask,
      sendSwapRequest,
      resolveSwap,
      createShareLink,
      revokeShareLink,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
