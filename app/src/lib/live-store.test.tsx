import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { useStore } from "./store-context";
import type { GroupSnapshot } from "./group-data";

// A stand-in Supabase client: RPC results are queued per test, Realtime does nothing.
const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  createSignedUrl: vi.fn(),
  fetchGroupSnapshot: vi.fn(),
}));

vi.mock("./supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  const client = {
    rpc: fake.rpc,
    channel: () => channel,
    removeChannel: () => {},
    storage: { from: () => ({ createSignedUrl: fake.createSignedUrl }) },
  };
  return { createClient: () => client };
});
vi.mock("./group-data", () => ({ fetchGroupSnapshot: fake.fetchGroupSnapshot }));

import { LiveStoreProvider } from "./live-store";

function snapshot(status: "open" | "assigned", assignee: string | null): GroupSnapshot {
  return {
    fetchedAt: 0,
    group: { id: "g1", name: "Capstone", inviteCode: "ABCDEFGH" },
    members: [
      { id: "lea", name: "Lea", role: "leader" },
      { id: "mo", name: "Mo", role: "member" },
    ],
    tasks: [
      {
        id: 1,
        title: "Outline",
        status,
        assignee,
        deadlineAt: Date.now() + 1e9,
        proof: null,
        submittedAt: null,
        rejectReason: null,
        swapPending: false,
      },
    ],
    swaps: [],
    log: [],
    shareLinks: [],
  };
}

let store: ReturnType<typeof useStore>;
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

function renderStore(userId = "mo") {
  render(
    <LiveStoreProvider initial={snapshot("open", null)} userId={userId}>
      <StoreProbe />
    </LiveStoreProvider>,
  );
}

beforeEach(() => {
  fake.rpc.mockReset();
  fake.createSignedUrl.mockReset();
  fake.fetchGroupSnapshot.mockReset();
});
afterEach(cleanup);

describe("live store", () => {
  it("shows a claim straight away, before the server answers", async () => {
    let answer!: (v: { error: null }) => void;
    fake.rpc.mockReturnValue(new Promise((r) => (answer = r)));
    fake.fetchGroupSnapshot.mockResolvedValue(snapshot("assigned", "mo"));
    renderStore();

    act(() => store.claimTask(1));
    expect(store.getTask(1)).toMatchObject({ status: "assigned", assignee: "mo" });
    expect(fake.rpc).toHaveBeenCalledWith("claim_task", { p_task: 1 });

    await act(async () => answer({ error: null }));
    expect(store.error).toBeNull();
  });

  it("snaps back and explains when the server refuses", async () => {
    fake.rpc.mockResolvedValue({ error: { message: "task is not open", code: "23514" } });
    fake.fetchGroupSnapshot.mockResolvedValue(snapshot("assigned", "lea"));
    renderStore();

    await act(async () => store.claimTask(1));

    expect(store.error).toBe("Someone else claimed that task first.");
    expect(store.getTask(1)?.assignee).toBe("lea");
  });

  it("never shows a raw database error", async () => {
    fake.rpc.mockResolvedValue({
      error: { message: 'relation "x" does not exist', code: "42P01" },
    });
    fake.fetchGroupSnapshot.mockResolvedValue(snapshot("open", null));
    renderStore();

    await act(async () => store.claimTask(1));

    expect(store.error).toBe("That didn't go through. Check your connection and try again.");
  });

  it("signs a file proof's link once and reuses it", async () => {
    fake.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/1" } });
    renderStore();
    const proof = { type: "file" as const, value: "a.pdf", path: "g1/1/x-a.pdf" };

    expect(await store.resolveProofUrl(proof)).toBe("https://signed/1");
    expect(await store.resolveProofUrl(proof)).toBe("https://signed/1");
    expect(fake.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(await store.resolveProofUrl({ type: "text", value: "note" })).toBeNull();
  });
});
