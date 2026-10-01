import { describe, expect, it } from "vitest";
import {
  PROOF_LINK_MAX,
  PROOF_TEXT_MAX,
  REJECT_REASON_MAX,
  normalizeProofLink,
  validateProof,
  validateRejectReason,
} from "./validation";

describe("normalizeProofLink", () => {
  it("accepts http(s) URLs and prepends https:// to bare hosts", () => {
    expect(normalizeProofLink("https://drive.google.com/x")).toEqual({
      ok: true,
      value: "https://drive.google.com/x",
    });
    expect(normalizeProofLink("  drive.google.com/final-video ")).toEqual({
      ok: true,
      value: "https://drive.google.com/final-video",
    });
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(document.cookie)",
    "java\u0000script:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "ftp://example.com/x",
  ])("rejects non-http scheme %s", (input) => {
    expect(normalizeProofLink(input).ok).toBe(false);
  });

  it("rejects credentials, whitespace, hostless and over-long input", () => {
    expect(normalizeProofLink("https://user:pw@example.com").ok).toBe(false);
    expect(normalizeProofLink("https://exa mple.com").ok).toBe(false);
    expect(normalizeProofLink("notalink").ok).toBe(false);
    expect(normalizeProofLink("").ok).toBe(false);
    expect(normalizeProofLink(`https://example.com/${"a".repeat(PROOF_LINK_MAX)}`).ok).toBe(false);
  });
});

describe("validateProof", () => {
  it("trims text and enforces its length cap", () => {
    expect(validateProof("text", "  did it  ")).toEqual({
      ok: true,
      value: { type: "text", value: "did it" },
    });
    expect(validateProof("text", "   ").ok).toBe(false);
    expect(validateProof("text", "a".repeat(PROOF_TEXT_MAX)).ok).toBe(true);
    expect(validateProof("text", "a".repeat(PROOF_TEXT_MAX + 1)).ok).toBe(false);
  });

  it("strips control characters but keeps newlines", () => {
    expect(validateProof("text", "line1\n\u0007line2")).toEqual({
      ok: true,
      value: { type: "text", value: "line1\nline2" },
    });
  });

  it("routes links through the URL check", () => {
    expect(validateProof("link", "javascript:alert(1)").ok).toBe(false);
  });
});

describe("validateRejectReason", () => {
  it("requires a non-blank reason within the cap", () => {
    expect(validateRejectReason("  missing sources ")).toEqual({
      ok: true,
      value: "missing sources",
    });
    expect(validateRejectReason(" \n ").ok).toBe(false);
    expect(validateRejectReason("a".repeat(REJECT_REASON_MAX + 1)).ok).toBe(false);
  });
});
