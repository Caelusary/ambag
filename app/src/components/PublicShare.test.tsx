import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { DEMO_SHARE_TOKEN, StoreProvider, useStore } from "@/lib/store";
import { PublicShare } from "./PublicShare";

let store: ReturnType<typeof useStore>;
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

function renderShare(token: string) {
  return render(
    <StoreProvider>
      <StoreProbe />
      <PublicShare token={token} />
    </StoreProvider>,
  );
}

afterEach(cleanup);

describe("public share view", () => {
  it("shows the activity log for a live link", () => {
    renderShare(DEMO_SHARE_TOKEN);
    expect(screen.getByText("Activity log")).toBeTruthy();
  });

  it("shows nothing of the group for a token that was never issued", () => {
    renderShare("made-up-token");
    expect(screen.getByText(/This link isn.t valid/)).toBeTruthy();
    expect(screen.queryByText("Activity log")).toBeNull();
  });

  it("stops working the moment the leader revokes it", () => {
    renderShare(DEMO_SHARE_TOKEN);
    act(() => store.setCurrentUser("Maya"));
    act(() => store.revokeShareLink(DEMO_SHARE_TOKEN));

    expect(screen.queryByText("Activity log")).toBeNull();
    expect(screen.getByText(/This link isn.t valid/)).toBeTruthy();
  });
});
