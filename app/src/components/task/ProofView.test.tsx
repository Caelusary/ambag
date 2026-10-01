import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
