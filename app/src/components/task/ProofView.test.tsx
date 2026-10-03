import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProofView } from "./ProofView";

afterEach(cleanup);

describe("ProofView", () => {
  it("makes a link proof openable in a new tab", () => {
    render(<ProofView proof={{ type: "link", value: "drive.google.com/final-video" }} />);

    const link = screen.getByRole("link", { name: "drive.google.com/final-video" });
    expect(link.getAttribute("href")).toBe("https://drive.google.com/final-video");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("never turns a stored javascript: value into a link", () => {
    render(<ProofView proof={{ type: "link", value: "javascript:alert(1)" }} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Link: javascript:alert(1)")).toBeTruthy();
  });

  it("shows file and text proofs as plain text", () => {
    render(<ProofView proof={{ type: "file", value: "deck.pdf" }} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("File: deck.pdf")).toBeTruthy();
  });
});

describe("ProofView with a stored file", () => {
  it("asks for a download link only when the proof is shown, then links it", async () => {
    const resolveUrl = vi.fn().mockResolvedValue("blob:signed-file");
    render(
      <ProofView
        proof={{ type: "file", value: "deck.pdf", path: "g/1/x-deck.pdf" }}
        resolveUrl={resolveUrl}
      />,
    );

    expect(screen.getByText("File: deck.pdf")).toBeTruthy();
    const link = await screen.findByRole("link", { name: "deck.pdf" });
    expect(link.getAttribute("href")).toBe("blob:signed-file");
    expect(resolveUrl).toHaveBeenCalledTimes(1);
  });

  it("won't link a resolved URL from anywhere else", async () => {
    const resolveUrl = vi.fn().mockResolvedValue("https://evil.example/file");
    render(
      <ProofView
        proof={{ type: "file", value: "deck.pdf", path: "g/1/x-deck.pdf" }}
        resolveUrl={resolveUrl}
      />,
    );

    await vi.waitFor(() => expect(resolveUrl).toHaveBeenCalled());
    expect(screen.queryByRole("link")).toBeNull();
  });
});
