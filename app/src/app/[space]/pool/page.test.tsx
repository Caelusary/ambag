import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import PoolPage from "./page";

let store: ReturnType<typeof useStore>;
// Exposes the live store to assertions; written in an effect so render stays pure.
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

function renderPool() {
  return render(
    <StoreProvider>
      <StoreProbe />
      <PoolPage />
    </StoreProvider>,
  );
}

const openSection = () =>
  screen.getByRole("heading", { name: "Open for grabs" }).closest("section")!;
const mySection = () => screen.getByRole("heading", { name: "Your tasks" }).closest("section")!;

afterEach(cleanup);

describe("pool page", () => {
  it("lists only open tasks under Open for grabs, each with a named claim button", () => {
    renderPool();
    const open = within(openSection());
    expect(open.getByText("Design cover slide")).toBeTruthy();
    expect(open.getByText("Interview stakeholder")).toBeTruthy();
    expect(open.queryByText("Write intro paragraph")).toBeNull();
    expect(open.getAllByRole("button", { name: /^Call dibs/ })).toHaveLength(2);
  });

  it("moves a claimed task from the pool into Your tasks, assigned to the current user", () => {
    renderPool();
    const [first] = within(openSection()).getAllByRole("button", { name: /^Call dibs/ });
    fireEvent.click(first);

    expect(within(openSection()).queryByText("Design cover slide")).toBeNull();
    const link = within(mySection()).getByRole("link", { name: /Design cover slide/ });
    expect(link.getAttribute("href")).toBe("/task/1");
    expect(within(link).getByText("Assigned")).toBeTruthy();
    expect(store.getTask(1)).toMatchObject({ status: "assigned", assignee: "Jamie" });
    expect(store.log[0].text).toBe('Jamie called dibs on "Design cover slide"');
  });

  it("shows the empty state once every open task has been claimed", () => {
    renderPool();
    for (const button of within(openSection()).getAllByRole("button", { name: /^Call dibs/ })) {
      fireEvent.click(button);
    }
    expect(within(openSection()).queryAllByRole("button")).toHaveLength(0);
    expect(within(openSection()).getByText("No open tasks right now.")).toBeTruthy();
  });

  it("links each of the current user's tasks to its detail page with its status", () => {
    renderPool();
    const links = within(mySection()).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/task/7", "/task/8", "/task/10"]);
  });

  it("shows a swap-pending task as such in Your tasks", () => {
    renderPool();
    act(() => store.sendSwapRequest(8, "release", null));
    const link = within(mySection()).getByRole("link", { name: /Format bibliography/ });
    expect(within(link).getByText("Assigned · Swap pending")).toBeTruthy();
  });
});
