import type { Proof, SwapRequest, Task } from "./types";

/**
 * What the screen shows the instant an action is clicked, before the server answers. Each one is
 * the success path only; the live store refetches after every call, so a refusal snaps back to the
 * server's truth and shows the error. Pure functions, so they're tested without a database.
 */
interface Lists {
  tasks: Task[];
  swaps: SwapRequest[];
}

const patchTask = (tasks: Task[], id: number, patch: (t: Task) => Task) =>
  tasks.map((t) => (t.id === id ? patch(t) : t));

export const optimistic = {
  claim: (s: Lists, id: number, me: string): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) =>
      t.status === "open" ? { ...t, status: "assigned", assignee: me } : t,
    ),
  }),

  markSeen: (s: Lists, id: number, me: string): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) =>
      t.status === "assigned" && t.assignee === me ? { ...t, status: "seen" } : t,
    ),
  }),

  submit: (s: Lists, id: number, proof: Proof, now: number): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) => ({
      ...t,
      status: "submitted",
      proof,
      submittedAt: now,
      rejectReason: null,
    })),
  }),

  accept: (s: Lists, id: number): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) => ({ ...t, status: "accepted" })),
  }),

  reject: (s: Lists, id: number, reason: string): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) => ({ ...t, status: "rejected", rejectReason: reason })),
  }),

  requestSwap: (s: Lists, id: number): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) => ({ ...t, swapPending: true })),
  }),

  resolveSwap: (s: Lists, requestId: number, approve: boolean): Lists => {
    const request = s.swaps.find((r) => r.id === requestId);
    if (!request) return s;
    return {
      swaps: s.swaps.map((r) =>
        r.id === requestId ? { ...r, status: approve ? "approved" : "denied" } : r,
      ),
      tasks: patchTask(s.tasks, request.taskId, (t) => {
        if (!approve) return { ...t, swapPending: false };
        return request.mode === "targeted"
          ? { ...t, assignee: request.target, status: "assigned", swapPending: false }
          : { ...t, assignee: null, status: "open", swapPending: false };
      }),
    };
  },

  update: (s: Lists, id: number, title: string, deadlineAt: number): Lists => ({
    ...s,
    tasks: patchTask(s.tasks, id, (t) => ({ ...t, title, deadlineAt })),
  }),

  remove: (s: Lists, id: number): Lists => ({
    tasks: s.tasks.filter((t) => t.id !== id),
    swaps: s.swaps.filter((r) => r.taskId !== id),
  }),
};
