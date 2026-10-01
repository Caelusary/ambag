import { describe, expect, it } from "vitest";
import {
  canRequestSwap,
  canReview,
  canSubmitProof,
  computeLedger,
  isInsideSwapCutoff,
  swapApprovalBlocker,
} from "./rules";
import { formatDeadline, statusLabel, type SwapRequest, type Task } from "./types";

const HOUR = 1000 * 60 * 60;
const NOW = 1_767_225_600_000;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Write intro",
    status: "assigned",
    assignee: "Jamie",
    deadlineAt: NOW + 96 * HOUR,
    proof: null,
    submittedAt: null,
    rejectReason: null,
    swapPending: false,
    ...overrides,
  };
}

describe("formatDeadline", () => {
  it.each([
    [1, "in 1 hour"],
    [5, "in 5 hours"],
    [47, "in 47 hours"],
    [48, "in 2 days"],
    [0, "due now"],
    [-3, "overdue by 3h"],
    [-72, "overdue by 3d"],
  ])("formats %ih from now as %s", (hours, expected) => {
    expect(formatDeadline(NOW + hours * HOUR, NOW)).toBe(expected);
  });
});

describe("canSubmitProof", () => {
  it("allows the assignee while the task is in progress or was rejected", () => {
    for (const status of ["assigned", "seen", "rejected"] as const) {
      expect(canSubmitProof(task({ status }), "Jamie")).toBe(true);
    }
  });

  it("blocks anyone who is not the assignee", () => {
    expect(canSubmitProof(task(), "Maya")).toBe(false);
  });

  it("blocks resubmitting once the task is under review or accepted", () => {
    expect(canSubmitProof(task({ status: "submitted" }), "Jamie")).toBe(false);
    expect(canSubmitProof(task({ status: "accepted" }), "Jamie")).toBe(false);
  });
});

describe("canRequestSwap", () => {
  it("allows the assignee on an in-progress task", () => {
    expect(canRequestSwap(task({ status: "seen" }), "Jamie")).toBe(true);
  });

  it("blocks a second request while one is pending", () => {
    expect(canRequestSwap(task({ swapPending: true }), "Jamie")).toBe(false);
  });

  it("blocks swapping a task that has already been submitted", () => {
    expect(canRequestSwap(task({ status: "submitted" }), "Jamie")).toBe(false);
  });
});

describe("isInsideSwapCutoff", () => {
  it("is inside the window under 48 hours out", () => {
    expect(isInsideSwapCutoff(task({ deadlineAt: NOW + 47.9 * HOUR }), NOW)).toBe(true);
  });

  it("is outside the window at exactly 48 hours out", () => {
    expect(isInsideSwapCutoff(task({ deadlineAt: NOW + 48 * HOUR }), NOW)).toBe(false);
  });
});

describe("statusLabel", () => {
  it("appends the pending swap to the status", () => {
    expect(statusLabel(task({ swapPending: true }))).toBe("Assigned · Swap pending");
  });
});

describe("canReview", () => {
  it("lets only the leader review, and only submitted work", () => {
    expect(canReview(task({ status: "submitted" }), "leader")).toBe(true);
    expect(canReview(task({ status: "submitted" }), "member")).toBe(false);
    expect(canReview(task({ status: "accepted" }), "leader")).toBe(false);
  });
});

describe("swapApprovalBlocker", () => {
  const request = (overrides: Partial<SwapRequest> = {}): SwapRequest => ({
    id: 1,
    taskId: 1,
    from: "Jamie",
    mode: "targeted",
    target: "Maya",
    status: "pending",
    ts: NOW,
    ...overrides,
  });

  it("allows a pending request on a task still in progress and outside the cutoff", () => {
    expect(swapApprovalBlocker(request(), task(), NOW)).toBeNull();
  });

  it("blocks once the requester has submitted proof", () => {
    expect(swapApprovalBlocker(request(), task({ status: "submitted" }), NOW)).toMatch(/moved on/);
  });

  it("blocks once the deadline is inside the cutoff", () => {
    const late = task({ deadlineAt: NOW + 10 * HOUR });
    expect(swapApprovalBlocker(request(), late, NOW)).toMatch(/under 48 hours/);
  });

  it("blocks a request that was already decided", () => {
    expect(swapApprovalBlocker(request({ status: "denied" }), task(), NOW)).toMatch(/already/);
  });
});

describe("computeLedger", () => {
  it("counts on time and late by submission, not by review", () => {
    const tasks = [
      task({ id: 1, status: "accepted", deadlineAt: NOW, submittedAt: NOW - HOUR }),
      task({ id: 2, status: "accepted", deadlineAt: NOW, submittedAt: NOW + HOUR }),
    ];

    const [jamie] = computeLedger(["Jamie"], tasks, [], NOW + 100 * HOUR);

    expect(jamie).toMatchObject({ onTime: 1, late: 1 });
  });

  it("counts unfinished work past its deadline as overdue, but not work waiting for review", () => {
    const tasks = [
      task({ id: 1, status: "seen", deadlineAt: NOW - HOUR }),
      task({ id: 2, status: "rejected", deadlineAt: NOW - HOUR }),
      task({ id: 3, status: "submitted", deadlineAt: NOW - HOUR, submittedAt: NOW - 2 * HOUR }),
      task({ id: 4, status: "assigned", deadlineAt: NOW + HOUR }),
    ];

    expect(computeLedger(["Jamie"], tasks, [], NOW)[0].overdue).toBe(2);
  });

  it("counts every swap request a member made", () => {
    const swaps: SwapRequest[] = [
      { id: 1, taskId: 1, from: "Jamie", mode: "release", target: null, status: "denied", ts: NOW },
      { id: 2, taskId: 2, from: "Maya", mode: "release", target: null, status: "pending", ts: NOW },
    ];

    expect(computeLedger(["Jamie"], [], swaps, NOW)[0].swaps).toBe(1);
  });
});
