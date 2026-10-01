import type { Proof, ProofType } from "./types";

/**
 * Input limits and normalisation for user-supplied strings. The client uses
 * these to give early feedback; the backend must apply the same rules again
 * (DB CHECK constraints / RPC validation), because a client check is advisory.
 */
export const PROOF_LINK_MAX = 2048;
export const PROOF_TEXT_MAX = 2000;
export const PROOF_FILE_NAME_MAX = 255;
export const REJECT_REASON_MAX = 500;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

// C0 control characters and DEL, except tab and newline.
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

function clean(raw: string): string {
  return raw.replace(CONTROL_CHARS, "").trim();
}

/**
 * Accepts only http(s) URLs. A bare host ("drive.google.com/x") gets https://
 * prepended. Anything with another scheme (javascript:, data:, file:, ...) is
 * rejected so the value is safe to use as an href later.
 */
export function normalizeProofLink(raw: string): ValidationResult<string> {
  const value = clean(raw);
  if (!value) return { ok: false, error: "Enter a link." };
  if (value.length > PROOF_LINK_MAX) {
    return { ok: false, error: `Links can be at most ${PROOF_LINK_MAX} characters.` };
  }
  if (/\s/.test(value)) return { ok: false, error: "Links can't contain spaces." };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const candidate = hasScheme ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "That doesn't look like a valid link." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// links are allowed." };
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    return { ok: false, error: "That doesn't look like a valid link." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Links can't include a username or password." };
  }
  if (url.href.length > PROOF_LINK_MAX) {
    return { ok: false, error: `Links can be at most ${PROOF_LINK_MAX} characters.` };
  }
  return { ok: true, value: url.href };
}

export function validateProof(type: ProofType, raw: string): ValidationResult<Proof> {
  if (type === "link") {
    const link = normalizeProofLink(raw);
    return link.ok ? { ok: true, value: { type, value: link.value } } : link;
  }
  const value = clean(raw);
  if (type === "file") {
    if (!value) return { ok: false, error: "Choose a file." };
    if (value.length > PROOF_FILE_NAME_MAX) {
      return { ok: false, error: `File names can be at most ${PROOF_FILE_NAME_MAX} characters.` };
    }
    return { ok: true, value: { type, value } };
  }
  if (!value) return { ok: false, error: "Describe what you did." };
  if (value.length > PROOF_TEXT_MAX) {
    return { ok: false, error: `Notes can be at most ${PROOF_TEXT_MAX} characters.` };
  }
  return { ok: true, value: { type, value } };
}

/** 10 MB: enough for a slide deck or a scanned page, small enough to keep in memory. */
export const PROOF_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** What counts as evidence of finished work. Executables, archives and HTML are deliberately out. */
export const PROOF_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

/** Accept attribute for the file picker, built from the same list the check uses. */
export const PROOF_FILE_ACCEPT = Object.keys(PROOF_FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export function validateProofFile(file: {
  name: string;
  size: number;
  type: string;
}): ValidationResult<string> {
  const name = clean(file.name);
  if (!name) return { ok: false, error: "Choose a file." };
  if (name.length > PROOF_FILE_NAME_MAX) {
    return { ok: false, error: `File names can be at most ${PROOF_FILE_NAME_MAX} characters.` };
  }
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const expected = PROOF_FILE_TYPES[ext];
  // The extension must be on the list, and the browser's type (when it reports one) must agree,
  // so "notes.pdf" that is really an HTML page doesn't pass.
  if (!expected || (file.type && file.type !== expected)) {
    return { ok: false, error: "Upload a PDF, image, Word, PowerPoint, Excel or text file." };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > PROOF_FILE_MAX_BYTES) {
    return { ok: false, error: "Files can be at most 10 MB." };
  }
  return { ok: true, value: name };
}

export function validateRejectReason(raw: string): ValidationResult<string> {
  const value = clean(raw);
  if (!value) return { ok: false, error: "A reason is required." };
  if (value.length > REJECT_REASON_MAX) {
    return { ok: false, error: `Reasons can be at most ${REJECT_REASON_MAX} characters.` };
  }
  return { ok: true, value };
}
