import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { AddTask } from "./AddTask";

let store: ReturnType<typeof useStore>;
// Exposes the live store to assertions; written in an effect so render stays pure.
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

function renderAddTask() {
  return render(
    <StoreProvider>
      <StoreProbe />
      <AddTask />
    </StoreProvider>,
  );
}

afterEach(cleanup);

describe("add task", () => {
  it("is hidden from members", () => {
    renderAddTask();
    expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();
  });

  it("lets the leader add a titled task to the pool", () => {
    renderAddTask();
    act(() => store.setCurrentUser("Maya"));
    const before = store.tasks.length;

    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    const add = screen.getByRole("button", { name: "Add to pool" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Book the room  " } });
    fireEvent.click(add);

    expect(store.tasks).toHaveLength(before + 1);
    expect(store.tasks.at(-1)).toMatchObject({ title: "Book the room", status: "open" });
    expect(store.log[0].text).toBe('Maya added "Book the room"');
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("won't accept a deadline in the past", () => {
    renderAddTask();
    act(() => store.setCurrentUser("Maya"));
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Too late" } });
    fireEvent.change(screen.getByLabelText("Deadline"), { target: { value: "2020-01-01T09:00" } });

    expect(
      (screen.getByRole("button", { name: "Add to pool" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText("Pick a time in the future.")).toBeTruthy();
  });
});
