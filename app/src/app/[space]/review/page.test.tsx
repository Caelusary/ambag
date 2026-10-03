import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import ReviewPage from "./page";

let store: ReturnType<typeof useStore>;
// Exposes the live store to assertions; written in an effect so render stays pure.
function StoreProbe() {
  const value = useStore();
  useEffect(() => {
    store = value;
  });
  return null;
}

// Review is the leader's page, so these tests act as Maya.
function renderReview() {
  const result = render(
    <StoreProvider>
      <StoreProbe />
      <ReviewPage />
    </StoreProvider>,
  );
  act(() => store.setCurrentUser("Maya"));
  return result;
}

function openRejectDialog() {
  fireEvent.click(screen.getByRole("button", { name: /^Reject\b/ }));
  return screen.getByRole("dialog", { name: "Reject submission" });
}

afterEach(cleanup);

describe("review page", () => {
  it("lists only submitted tasks, with assignee and proof", () => {
    renderReview();
    expect(screen.getByText("Edit final video")).toBeTruthy();
    expect(screen.getByText("Priya")).toBeTruthy();
    const proofLink = screen.getByRole("link", { name: "drive.google.com/final-video" });
    expect(proofLink.getAttribute("href")).toBe("https://drive.google.com/final-video");
    expect(proofLink.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByText("Build slide deck")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Accept\b/ })).toHaveLength(1);
  });

  it("accepts a submission and falls back to the empty state", () => {
    renderReview();
    fireEvent.click(screen.getByRole("button", { name: /^Accept\b/ }));

    expect(store.getTask(4)?.status).toBe("accepted");
    expect(screen.queryByText("Edit final video")).toBeNull();
    expect(screen.getByText("Nothing to review right now.")).toBeTruthy();
  });

  it("opens a labelled reject dialog naming who will see the reason", () => {
    renderReview();
    const dialog = within(openRejectDialog());
    expect(dialog.getByLabelText("Reason").tagName).toBe("TEXTAREA");
    expect(dialog.getByText(/so Priya knows what to fix/)).toBeTruthy();
  });

  it("keeps Confirm reject disabled until a non-blank reason is typed", () => {
    renderReview();
    const dialog = within(openRejectDialog());
    const confirm = dialog.getByRole("button", { name: "Confirm reject" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "   " } });
    expect(confirm.disabled).toBe(true);

    fireEvent.click(confirm);
    expect(store.getTask(4)?.status).toBe("submitted");
  });

  it("rejects with the trimmed reason, closes the dialog and logs it", () => {
    renderReview();
    const dialog = within(openRejectDialog());
    fireEvent.change(dialog.getByLabelText("Reason"), {
      target: { value: "  Audio is out of sync  " },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Confirm reject" }));

    expect(store.getTask(4)).toMatchObject({
      status: "rejected",
      rejectReason: "Audio is out of sync",
    });
    expect(store.log[0].text).toBe('Maya rejected "Edit final video": Audio is out of sync');
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Nothing to review right now.")).toBeTruthy();
  });

  it("leaves the submission untouched when the dialog is cancelled", () => {
    renderReview();
    const dialog = within(openRejectDialog());
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Nope" } });
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.getTask(4)?.status).toBe("submitted");
  });

  it("starts the reason blank when the dialog is reopened", () => {
    renderReview();
    fireEvent.change(within(openRejectDialog()).getByLabelText("Reason"), {
      target: { value: "Draft reason" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const reopened = within(openRejectDialog());
    expect((reopened.getByLabelText("Reason") as HTMLTextAreaElement).value).toBe("");
  });

  it("picks up a new submission without a reload", () => {
    renderReview();
    act(() => store.setCurrentUser("Jamie"));
    act(() => store.submitProof(7, { type: "text", value: "Recorded in one take." }));
    act(() => store.setCurrentUser("Maya"));

    expect(screen.getByText("Record voiceover")).toBeTruthy();
    expect(screen.getByText("Note: Recorded in one take.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Accept\b/ })).toHaveLength(2);
  });
});

describe("reject dialog keyboard", () => {
  it("closes on Escape without rejecting, and hands focus back to the Reject button", () => {
    renderReview();
    const rejectButton = screen.getByRole("button", { name: /^Reject\b/ });
    rejectButton.focus();
    fireEvent.click(rejectButton);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "half typed" } });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Edit final video")).toBeTruthy();
    expect(document.activeElement).toBe(rejectButton);
  });
});

describe("review access and swaps", () => {
  it("shows members a notice instead of the review controls", () => {
    render(
      <StoreProvider>
        <StoreProbe />
        <ReviewPage />
      </StoreProvider>,
    );

    expect(screen.getByText(/Only the group leader reviews work/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Accept\b/ })).toBeNull();
  });

  it("gives each Accept button the task's name for screen readers", () => {
    renderReview();
    expect(screen.getByRole("button", { name: "Accept Edit final video" })).toBeTruthy();
  });

  it("approves a targeted swap, handing the task to the named teammate", () => {
    renderReview();
    act(() => store.setCurrentUser("Jamie"));
    act(() => store.sendSwapRequest(8, "targeted", "Priya"));
    act(() => store.setCurrentUser("Maya"));

    fireEvent.click(screen.getByRole("button", { name: /^Approve\b/ }));

    expect(store.getTask(8)).toMatchObject({
      assignee: "Priya",
      status: "assigned",
      swapPending: false,
    });
    expect(store.log[0].text).toBe(
      'Maya approved the swap: "Format bibliography" moves from Jamie to Priya',
    );
  });

  it("approves a release, returning the task to the pool", () => {
    renderReview();
    act(() => store.setCurrentUser("Jamie"));
    act(() => store.sendSwapRequest(8, "release", null));
    act(() => store.setCurrentUser("Maya"));

    fireEvent.click(screen.getByRole("button", { name: /^Approve\b/ }));

    expect(store.getTask(8)).toMatchObject({ assignee: null, status: "open" });
  });

  it("denies a swap, leaving the task with the requester", () => {
    renderReview();
    act(() => store.setCurrentUser("Jamie"));
    act(() => store.sendSwapRequest(8, "targeted", "Priya"));
    act(() => store.setCurrentUser("Maya"));

    fireEvent.click(screen.getByRole("button", { name: /^Deny\b/ }));

    expect(store.getTask(8)).toMatchObject({ assignee: "Jamie", swapPending: false });
    expect(screen.getByText("No swap requests waiting.")).toBeTruthy();
  });

  it("won't approve a swap once the requester has submitted proof", () => {
    renderReview();
    act(() => store.setCurrentUser("Jamie"));
    act(() => store.sendSwapRequest(8, "targeted", "Priya"));
    act(() => store.submitProof(8, { type: "text", value: "Done anyway." }));
    act(() => store.setCurrentUser("Maya"));

    const approve = screen.getByRole("button", { name: /^Approve\b/ }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(screen.getByText(/The task has moved on/)).toBeTruthy();
  });
});
