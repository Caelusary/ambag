import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import SubmitProofPage from "./page";

const nav = vi.hoisted(() => ({ id: "8", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: nav.id }),
  useRouter: () => ({ push: nav.push }),
  usePathname: () => `/task/${nav.id}/proof`,
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

function renderProof(id: string) {
  nav.id = id;
  return render(
    <StoreProvider>
      <StoreProbe />
      <SubmitProofPage />
    </StoreProvider>,
  );
}

const submitButton = () =>
  screen.getByRole("button", { name: "Submit for review" }) as HTMLButtonElement;
const GUARD = "Proof can only be submitted by the assignee, before the task is reviewed.";

beforeEach(() => nav.push.mockReset());
afterEach(cleanup);

describe("submit proof page", () => {
  it("defaults to a labelled link input with submit disabled", () => {
    renderProof("8");
    expect(screen.getByText("Format bibliography")).toBeTruthy();
    expect((screen.getByLabelText("Link") as HTMLInputElement).value).toBe("");
    expect(submitButton().disabled).toBe(true);
  });

  it("keeps submit disabled for whitespace-only input", () => {
    renderProof("8");
    fireEvent.change(screen.getByLabelText("Link"), { target: { value: "   " } });
    expect(submitButton().disabled).toBe(true);
  });

  it("submits a trimmed link as https, logs it and returns to the task", () => {
    renderProof("8");
    fireEvent.change(screen.getByLabelText("Link"), {
      target: { value: "  docs.google.com/bib  " },
    });
    fireEvent.click(submitButton());

    expect(store.getTask(8)).toMatchObject({
      status: "submitted",
      proof: { type: "link", value: "https://docs.google.com/bib" },
    });
    expect(store.log[0].text).toBe('Jamie submitted proof for "Format bibliography"');
    expect(nav.push).toHaveBeenCalledWith("/task/8");
  });

  it("refuses a javascript: link, flags the field and stays on the page", () => {
    renderProof("8");
    const input = screen.getByLabelText("Link");
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(submitButton());

    expect(screen.getByRole("alert").textContent).toBe(
      "Only http:// and https:// links are allowed.",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("proof-error");
    expect(store.getTask(8)?.status).toBe("assigned");
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("clears the validation error as soon as the user edits the field", () => {
    renderProof("8");
    const input = screen.getByLabelText("Link");
    fireEvent.change(input, { target: { value: "not a link" } });
    fireEvent.click(submitButton());
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.change(input, { target: { value: "notalink.com" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("submits a text note", () => {
    renderProof("8");
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Formatted in APA 7." } });
    fireEvent.click(submitButton());

    expect(store.getTask(8)?.proof).toEqual({ type: "text", value: "Formatted in APA 7." });
  });

  it("submits the chosen file so the reviewer can open it", () => {
    // jsdom has no object URLs; the real browser returns a blob: URL.
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/bibliography");
    renderProof("8");
    fireEvent.click(screen.getByRole("button", { name: "File" }));
    const file = new File(["x"], "bibliography.docx");
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [file] } });
    fireEvent.click(submitButton());

    expect(store.getTask(8)?.proof).toEqual({
      type: "file",
      value: "bibliography.docx",
      url: "blob:http://localhost/bibliography",
    });
  });

  it("refuses a file type that isn't evidence, before submitting", () => {
    renderProof("8");
    fireEvent.click(screen.getByRole("button", { name: "File" }));
    const file = new File(["<script>"], "notes.html", { type: "text/html" });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [file] } });

    expect(screen.getByRole("alert").textContent).toMatch(/Upload a PDF, image/);
    expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
    expect(store.getTask(8)?.status).toBe("assigned");
  });

  it("refuses a file whose type doesn't match its extension", () => {
    renderProof("8");
    fireEvent.click(screen.getByRole("button", { name: "File" }));
    const file = new File(["<html>"], "report.pdf", { type: "text/html" });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [file] } });

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("clears the typed value when switching proof type, so a link can't be sent as a note", () => {
    renderProof("8");
    fireEvent.change(screen.getByLabelText("Link"), { target: { value: "docs.google.com/bib" } });
    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    expect((screen.getByLabelText("Notes") as HTMLTextAreaElement).value).toBe("");
    expect(submitButton().disabled).toBe(true);
  });

  it("blocks a user who is not the assignee", () => {
    renderProof("2");
    expect(screen.getByText(GUARD)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
  });

  it("blocks an unclaimed task", () => {
    renderProof("1");
    expect(screen.getByText(GUARD)).toBeTruthy();
  });

  it("blocks a second submission once the task is waiting for review", () => {
    renderProof("8");
    fireEvent.change(screen.getByLabelText("Link"), { target: { value: "docs.google.com/bib" } });
    fireEvent.click(submitButton());

    expect(screen.getByText(GUARD)).toBeTruthy();
    expect(store.log.filter((e) => e.text.includes("Format bibliography"))).toHaveLength(1);
  });

  it("blocks the assignee once the task has been accepted", () => {
    renderProof("7");
    act(() => store.submitProof(7, { type: "text", value: "done" }));
    act(() => store.acceptTask(7));

    expect(screen.getByText(GUARD)).toBeTruthy();
  });

  it("lets the assignee resubmit after a rejection", () => {
    renderProof("7");
    act(() => store.submitProof(7, { type: "text", value: "done" }));
    act(() => store.setCurrentUser("Maya"));
    act(() => store.rejectTask(7, "Too quiet"));
    act(() => store.setCurrentUser("Jamie"));

    expect(screen.queryByText(GUARD)).toBeNull();
    fireEvent.change(screen.getByLabelText("Link"), {
      target: { value: "drive.google.com/vo-v2" },
    });
    fireEvent.click(submitButton());
    expect(store.getTask(7)).toMatchObject({ status: "submitted", rejectReason: null });
  });

  it.each(["999", "abc"])("shows the missing-task state for id %s", (id) => {
    renderProof(id);
    expect(screen.getByText("This task no longer exists.")).toBeTruthy();
  });
});
