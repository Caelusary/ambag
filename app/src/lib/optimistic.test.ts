import { describe, expect, it } from "vitest";
import { optimistic } from "./optimistic";
import type { SwapRequest, Task } from "./types";

function task(fields: Partial<Task> & Pick<Task, "id">): Task {
  return {
    title: "Task",
    status: "open",
    assignee: null,
    deadlineAt: 1_000,
    proof: null,
    submittedAt: null,
    rejectReason: null,
    swapPending: false,
    ...fields,
  };
}

const lists = (tasks: Task[], swaps: SwapRequest[] = []) => ({ tasks, swaps });

describe("optimistic updates", () => {
  it("claims only an open task, for the caller", () => {
    const s = lists([task({ id: 1 }), task({ id: 2, status: "assigned", assignee: "mo" })]);
    const next = optimistic.claim(s, 1, "lea");
    expect(next.tasks[0]).toMatchObject({ status: "assigned", assignee: "lea" });
    expect(optimistic.claim(s, 2, "lea").tasks[1].assignee).toBe("mo");
  });

  it("marks Seen only for the caller's own assigned task", () => {
    const s = lists([task({ id: 1, status: "assigned", assignee: "mo" })]);
    expect(optimistic.markSeen(s, 1, "lea").tasks[0].status).toBe("assigned");
    expect(optimistic.markSeen(s, 1, "mo").tasks[0].status).toBe("seen");
  });

  it("submits proof and clears an old rejection", () => {
    const s = lists([task({ id: 1, status: "rejected", assignee: "mo", rejectReason: "No" })]);
    const next = optimistic.submit(s, 1, { type: "text", value: "Fixed" }, 500);
    expect(next.tasks[0]).toMatchObject({
      status: "submitted",
      submittedAt: 500,
      rejectReason: null,
    });
  });

  it("approves a targeted swap by handing the task over", () => {
    const swap: SwapRequest = {
      id: 9,
      taskId: 1,
      from: "mo",
      mode: "targeted",
      target: "lea",
      status: "pending",
      ts: 0,
    };
    const s = lists([task({ id: 1, status: "seen", assignee: "mo", swapPending: true })], [swap]);
    const next = optimistic.resolveSwap(s, 9, true);
    expect(next.tasks[0]).toMatchObject({
      assignee: "lea",
      status: "assigned",
      swapPending: false,
    });
    expect(next.swaps[0].status).toBe("approved");
  });

  it("returns a released task to the pool, and leaves a denied one where it was", () => {
    const release: SwapRequest = {
      id: 9,
      taskId: 1,
      from: "mo",
      mode: "release",
      target: null,
      status: "pending",
      ts: 0,
    };
    const s = lists(
      [task({ id: 1, status: "seen", assignee: "mo", swapPending: true })],
      [release],
    );
    expect(optimistic.resolveSwap(s, 9, true).tasks[0]).toMatchObject({
      assignee: null,
      status: "open",
    });
    expect(optimistic.resolveSwap(s, 9, false).tasks[0]).toMatchObject({
      assignee: "mo",
      swapPending: false,
    });
  });

  it("removes a task together with its swap requests", () => {
    const swap: SwapRequest = {
      id: 9,
      taskId: 1,
      from: "mo",
      mode: "release",
      target: null,
      status: "pending",
      ts: 0,
    };
    const next = optimistic.remove(lists([task({ id: 1 }), task({ id: 2 })], [swap]), 1);
    expect(next.tasks.map((t) => t.id)).toEqual([2]);
    expect(next.swaps).toEqual([]);
  });
});
