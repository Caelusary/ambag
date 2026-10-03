import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import TaskDetailPage from "./page";

const nav = vi.hoisted(() => ({ id: "7", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: nav.id }),
  useRouter: () => ({ push: nav.push }),
  usePathname: () => `/task/${nav.id}`,
}));

let store: ReturnType<typeof useStore>;
// Exposes the live store to assertions; written in an effect so render stays pure.
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

function renderDetail(id: string) {
  nav.id = id;
  return render(
    <StoreProvider>
      <StoreProbe />
      <TaskDetailPage />
    </StoreProvider>,
  );
}

const button = (name: string) => screen.queryByRole("button", { name });
// The title, status tag, assignee and deadline at the top of the page.
const summary = () => within(screen.getByRole("region", { name: "Task summary" }));
// The avatar initial is decorative, so read the name from the last element of the field.
const assignee = () =>
  summary().getByText("Assignee").nextElementSibling?.lastElementChild?.textContent;

beforeEach(() => nav.push.mockReset());
afterEach(cleanup);

describe("task detail page", () => {
  it("marks the current user's assigned task as Seen on open", () => {
    renderDetail("7");
    expect(store.getTask(7)?.status).toBe("seen");
    // The stepper also has a "Seen" label, so look for the status tag specifically.
    expect(summary().getByText("Seen")).toBeTruthy();
  });

  it("leaves someone else's assigned task as Assigned", () => {
    renderDetail("2");
    expect(store.getTask(2)?.status).toBe("assigned");
    expect(assignee()).toBe("Maya");
  });

  it("does not move a submitted task back to Seen", () => {
    renderDetail("4");
    expect(store.getTask(4)?.status).toBe("submitted");
    expect(screen.getByText("Waiting for leader review.")).toBeTruthy();
  });

  it("lets the assignee go to proof and swap", () => {
    renderDetail("8");
    fireEvent.click(button("Submit proof")!);
    expect(nav.push).toHaveBeenLastCalledWith("/task/8/proof");
    fireEvent.click(button("Request swap")!);
    expect(nav.push).toHaveBeenLastCalledWith("/task/8/swap");
  });

  it("offers a non-assignee no proof or swap actions", () => {
    renderDetail("2");
    expect(button("Submit proof")).toBeNull();
    expect(button("Request swap")).toBeNull();
    expect(button("Call dibs")).toBeNull();
  });

  it("claims an open task for the current user", () => {
    renderDetail("1");
    expect(assignee()).toBe("Unclaimed");
    fireEvent.click(button("Call dibs")!);

    expect(store.getTask(1)?.assignee).toBe("Jamie");
    expect(assignee()).toBe("Jamie");
    expect(button("Call dibs")).toBeNull();
  });

  it("hides Request swap once a swap is pending", () => {
    renderDetail("8");
    act(() => store.sendSwapRequest(8, "release", null));
    expect(screen.getByText("Seen · Swap pending")).toBeTruthy();
    expect(button("Request swap")).toBeNull();
    expect(button("Submit proof")).toBeTruthy();
  });

  it("shows the reject reason and offers the assignee a resubmit", () => {
    renderDetail("7");
    act(() => store.submitProof(7, { type: "text", value: "done" }));
    act(() => store.setCurrentUser("Maya"));
    act(() => store.rejectTask(7, "Too quiet"));
    act(() => store.setCurrentUser("Jamie"));

    expect(screen.getByText("Too quiet")).toBeTruthy();
    expect(button("Resubmit proof")).toBeTruthy();
    expect(store.getTask(7)?.status).toBe("rejected");
  });

  it("shows the submitted proof and the accepted message", () => {
    renderDetail("5");
    expect(screen.getByText("File: slidedeck-final.pdf")).toBeTruthy();
    expect(screen.getByText("Accepted. Nice work.")).toBeTruthy();
  });

  it.each(["999", "abc"])("shows the missing-task state for id %s", (id) => {
    renderDetail(id);
    expect(screen.getByText("This task no longer exists.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("leader task controls", () => {
  it("are hidden from members", () => {
    renderDetail("1");
    expect(button("Edit task")).toBeNull();
    expect(button("Remove task")).toBeNull();
  });

  it("let the leader rename a task", () => {
    renderDetail("1");
    act(() => store.setCurrentUser("Maya"));
    fireEvent.click(button("Edit task")!);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Design the cover" } });
    fireEvent.click(button("Save changes")!);

    expect(store.getTask(1)?.title).toBe("Design the cover");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("let the leader remove an open task after confirming, then go back to the pool", () => {
    renderDetail("1");
    act(() => store.setCurrentUser("Maya"));
    fireEvent.click(button("Remove task")!);
    const dialog = screen.getByRole("dialog", { name: "Remove this task?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove task" }));

    expect(store.getTask(1)).toBeUndefined();
    expect(nav.push).toHaveBeenLastCalledWith("/pool");
  });

  it("offer no remove button once work is handed in", () => {
    renderDetail("4");
    act(() => store.setCurrentUser("Maya"));
    expect(button("Edit task")).not.toBeNull();
    expect(button("Remove task")).toBeNull();
  });
});
