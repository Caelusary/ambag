import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "./store";

afterEach(() => vi.restoreAllMocks());

function setup() {
  return renderHook(() => useStore(), { wrapper: StoreProvider }).result;
}

describe("store", () => {
  it("assigns a claimed task to the current user and logs it", () => {
    const store = setup();
    act(() => store.current.claimTask(1));

    const claimed = store.current.getTask(1);
    expect(claimed?.status).toBe("assigned");
    expect(claimed?.assignee).toBe(store.current.currentUser);
    expect(store.current.log[0].text).toBe('Jamie called dibs on "Design cover slide"');
  });

  it("only marks assigned tasks as seen", () => {
    const store = setup();
    act(() => store.current.markSeen(7));
    expect(store.current.getTask(7)?.status).toBe("seen");

    act(() => store.current.markSeen(4));
    expect(store.current.getTask(4)?.status).toBe("submitted");
  });

  it("clears the previous reject reason when proof is resubmitted", () => {
    const store = setup();
    act(() => store.current.submitProof(7, { type: "text", value: "First take." }));
    act(() => store.current.rejectTask(7, "Audio is clipping"));
    act(() => store.current.submitProof(7, { type: "text", value: "Re-recorded." }));

    const resubmitted = store.current.getTask(7);
    expect(resubmitted?.status).toBe("submitted");
    expect(resubmitted?.rejectReason).toBeNull();
  });

  it("refuses to reject without a reason", () => {
    const store = setup();
    const logLength = store.current.log.length;
    act(() => store.current.rejectTask(4, "   "));

    expect(store.current.getTask(4)?.status).toBe("submitted");
    expect(store.current.log).toHaveLength(logLength);
  });

  it("judges on time or late by when the proof went in, not when it was reviewed", () => {
    const store = setup();
    const realNow = Date.now();
    // "Record voiceover" is due 30 hours in. Proof goes in at 20 hours, the review at 40.
    vi.spyOn(Date, "now").mockReturnValue(realNow + 20 * 60 * 60 * 1000);
    act(() => store.current.submitProof(7, { type: "text", value: "Recorded." }));
    vi.spyOn(Date, "now").mockReturnValue(realNow + 40 * 60 * 60 * 1000);
    act(() => store.current.setCurrentUser("Maya"));
    act(() => store.current.acceptTask(7));

    expect(store.current.getTask(7)?.status).toBe("accepted");
    expect(store.current.log[0].text).toBe('Maya accepted "Record voiceover" (Jamie, on time)');
  });

  it("logs proof that went in after the deadline as late", () => {
    const store = setup();
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 40 * 60 * 60 * 1000);
    act(() => store.current.submitProof(7, { type: "text", value: "Recorded." }));
    act(() => store.current.setCurrentUser("Maya"));
    act(() => store.current.acceptTask(7));

    expect(store.current.log[0].text).toBe('Maya accepted "Record voiceover" (Jamie, late)');
  });

  it("appends to the log instead of rewriting it", () => {
    const store = setup();
    const before = store.current.log;
    act(() => store.current.sendSwapRequest(8, "targeted", "Maya"));

    expect(store.current.log.slice(1)).toEqual(before);
    expect(store.current.getTask(8)?.swapPending).toBe(true);
  });
});

describe("store rules", () => {
  it("won't claim a task that is already assigned", () => {
    const store = setup();
    const logLength = store.current.log.length;
    act(() => store.current.claimTask(2));

    expect(store.current.getTask(2)?.assignee).toBe("Maya");
    expect(store.current.log).toHaveLength(logLength);
  });

  it("won't take proof from someone who isn't the assignee", () => {
    const store = setup();
    act(() => store.current.submitProof(2, { type: "text", value: "Not mine." }));

    expect(store.current.getTask(2)?.status).toBe("assigned");
  });

  it("only accepts or rejects work that is waiting for review", () => {
    const store = setup();
    act(() => store.current.acceptTask(7));
    act(() => store.current.rejectTask(5, "Too late now"));

    expect(store.current.getTask(7)?.status).toBe("assigned");
    expect(store.current.getTask(5)?.status).toBe("accepted");
  });

  it("won't open a second swap request while one is pending", () => {
    const store = setup();
    act(() => store.current.sendSwapRequest(8, "targeted", "Maya"));
    const logLength = store.current.log.length;
    act(() => store.current.sendSwapRequest(8, "release", null));

    expect(store.current.log).toHaveLength(logLength);
  });
});

describe("share links", () => {
  it("won't let a member create or revoke a link", () => {
    const store = setup();
    act(() => store.current.createShareLink());
    act(() => store.current.revokeShareLink("demo"));

    expect(store.current.shareLinks).toHaveLength(1);
    expect(store.current.shareLinks.every((l) => l.revokedAt == null)).toBe(true);
  });

  it("gives the leader a fresh, unguessable token each time", () => {
    const store = setup();
    act(() => store.current.setCurrentUser("Maya"));
    act(() => store.current.createShareLink());
    act(() => store.current.createShareLink());
    // Newest first, with the seeded demo link last.
    const tokens = store.current.shareLinks.slice(0, 2).map((l) => l.token);

    expect(tokens[0]).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(tokens[0]).not.toBe(tokens[1]);
  });
});
