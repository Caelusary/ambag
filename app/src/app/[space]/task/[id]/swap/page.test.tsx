import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import SwapRequestPage from "./page";

const nav = vi.hoisted(() => ({ id: "8", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: nav.id }),
  useRouter: () => ({ push: nav.push }),
  usePathname: () => `/task/${nav.id}/swap`,
}));

const HOUR = 60 * 60 * 1000;

let store: ReturnType<typeof useStore>;
// Exposes the live store to assertions; written in an effect so render stays pure.
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

// Seed data: task 7 (Jamie) is due in 30h, inside the 48h cutoff;
// task 8 (Jamie) is due in 96h, outside it; task 2 belongs to Maya.
function renderSwap(id: string) {
  nav.id = id;
  return render(
    <StoreProvider>
      <StoreProbe />
      <SwapRequestPage />
    </StoreProvider>,
  );
}

/** Moves the demo clock forward and lets useNow's interval pick it up. */
function advanceClock(ms: number) {
  vi.setSystemTime(Date.now() + ms);
  act(() => vi.advanceTimersByTime(60_000));
}

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const GUARD = "Only the assignee can request a swap, and only while the task is in progress.";

beforeEach(() => nav.push.mockReset());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("swap page", () => {
  it("blocks a task inside the 48-hour window with no way to send", () => {
    renderSwap("7");
    expect(screen.getByText(/Swap requests close 48 hours before the deadline/)).toBeTruthy();
    const unavailable = screen.getByRole("button", {
      name: "Request swap unavailable",
    }) as HTMLButtonElement;
    expect(unavailable.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("offers every other member as a named radio, defaulting to the first", () => {
    renderSwap("8");
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "Maya",
      "Jordan",
      "Priya",
      "Sam",
      "Alex",
    ]);
    expect(radios[0].checked).toBe(true);
    expect(screen.queryByRole("radio", { name: "Jamie" })).toBeNull();
  });

  it("sends a targeted swap to the chosen member after confirmation", () => {
    renderSwap("8");
    fireEvent.click(screen.getByRole("radio", { name: "Priya" }));
    click("Send request");

    expect(screen.getByText('Request a swap with Priya for "Format bibliography"?')).toBeTruthy();
    expect(store.getTask(8)?.swapPending).toBe(false);

    click("Confirm");
    expect(store.getTask(8)?.swapPending).toBe(true);
    expect(store.log[0].text).toBe('Jamie requested a swap with Priya for "Format bibliography"');
    expect(screen.getByText(/Request sent and logged/)).toBeTruthy();

    click("Done");
    expect(nav.push).toHaveBeenCalledWith("/task/8");
  });

  it("sends a release request without a target", () => {
    renderSwap("8");
    click("Release");
    expect(screen.queryByRole("radio")).toBeNull();
    click("Send request");
    expect(
      screen.getByText('Release "Format bibliography" back to the pool for anyone to claim?'),
    ).toBeTruthy();

    click("Confirm");
    expect(store.log[0].text).toBe('Jamie asked to release "Format bibliography" back to the pool');
  });

  it("sends nothing when the confirmation is cancelled", () => {
    renderSwap("8");
    const logLength = store.log.length;
    click("Send request");
    click("Cancel");

    expect(screen.getByRole("button", { name: "Send request" })).toBeTruthy();
    expect(store.getTask(8)?.swapPending).toBe(false);
    expect(store.log).toHaveLength(logLength);
  });

  it("blocks the form live once the clock crosses into the 48-hour window", () => {
    vi.useFakeTimers();
    renderSwap("8");
    expect(screen.getByRole("button", { name: "Send request" })).toBeTruthy();

    advanceClock(49 * HOUR);
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
    expect(screen.getByRole("button", { name: "Request swap unavailable" })).toBeTruthy();
  });

  it("refuses a confirmation that lands after the cutoff passed mid-confirm", () => {
    vi.useFakeTimers();
    renderSwap("8");
    const logLength = store.log.length;
    click("Send request");

    advanceClock(49 * HOUR);
    click("Confirm");

    expect(store.getTask(8)?.swapPending).toBe(false);
    expect(store.log).toHaveLength(logLength);
    expect(screen.getByRole("button", { name: "Request swap unavailable" })).toBeTruthy();
  });

  it("blocks a user who is not the assignee", () => {
    renderSwap("2");
    expect(screen.getByText(GUARD)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("blocks a second request while one is already pending", () => {
    renderSwap("8");
    act(() => store.sendSwapRequest(8, "release", null));
    expect(screen.getByText(GUARD)).toBeTruthy();
  });

  it("blocks a task that is already submitted", () => {
    renderSwap("8");
    act(() => store.submitProof(8, { type: "text", value: "done" }));
    expect(screen.getByText(GUARD)).toBeTruthy();
  });

  it("shows the missing-task state for an unknown id", () => {
    renderSwap("999");
    expect(screen.getByText("This task no longer exists.")).toBeTruthy();
  });
});
