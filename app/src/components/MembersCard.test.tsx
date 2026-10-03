import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreContext, type StoreValue } from "@/lib/store-context";
import { SpaceProvider } from "@/lib/space";
import type { Member } from "@/lib/types";

const actions = vi.hoisted(() => ({
  transferLeadership: vi.fn(),
  leaveGroup: vi.fn(),
}));
vi.mock("@/actions/groups", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { MembersCard } from "./MembersCard";

const MEMBERS: Member[] = [
  { id: "lea", name: "Lea", role: "leader" },
  { id: "mo", name: "Mo", role: "member" },
];

function renderCard(me: "lea" | "mo") {
  // Only the fields MembersCard reads; the rest of the store isn't involved.
  const store = {
    members: MEMBERS,
    currentUser: me,
    role: me === "lea" ? "leader" : "member",
  } as unknown as StoreValue;
  render(
    <SpaceProvider
      value={{
        kind: "live",
        base: "/g1",
        groupId: "g1",
        groupName: "Capstone",
        inviteCode: "ABCDEFGH",
        groups: [],
      }}
    >
      <StoreContext.Provider value={store}>
        <MembersCard />
      </StoreContext.Provider>
    </SpaceProvider>,
  );
}

beforeEach(() => {
  actions.transferLeadership.mockReset().mockResolvedValue(null);
  actions.leaveGroup.mockReset().mockResolvedValue(null);
});
afterEach(cleanup);

describe("members card", () => {
  it("lets the leader hand the role to a teammate after confirming", async () => {
    renderCard("lea");
    expect(screen.queryByRole("button", { name: "Leave group" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Make Mo the leader" }));
    const dialog = screen.getByRole("dialog", { name: "Make Mo the leader?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Make leader" }));

    await vi.waitFor(() => expect(actions.transferLeadership).toHaveBeenCalledWith("g1", "mo"));
  });

  it("lets a member leave, and shows why when it's refused", async () => {
    actions.leaveGroup.mockResolvedValue("Couldn't leave the group. Try again.");
    renderCard("mo");
    expect(screen.queryByRole("button", { name: /Make .* the leader/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Leave group" }));
    const dialog = screen.getByRole("dialog", { name: "Leave this group?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave group" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Couldn't leave the group. Try again.",
    );
    expect(actions.leaveGroup).toHaveBeenCalledWith("g1");
  });
});
