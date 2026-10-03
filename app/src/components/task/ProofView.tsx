"use client";

import { useEffect, useState } from "react";
import { proofSummary, type Proof } from "@/lib/types";
import { normalizeProofLink } from "@/lib/validation";

const SIGNED_PROOF_PREFIX = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/proofs/`
  : null;

// A link this app made: an object URL in the demo, or a signed URL from this project's private
// bucket for a real group. Anything else is shown as text only.
function trustedFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("blob:")) return url;
  if (SIGNED_PROOF_PREFIX && url.startsWith(SIGNED_PROOF_PREFIX)) return url;
  return null;
}

/**
 * A stored file's download link, signed the first time the proof is shown rather than on every
 * refresh of the group. Null until it arrives, and for anything that isn't a stored file.
 */
function useSignedUrl(proof: Proof | null, resolveUrl?: (proof: Proof) => Promise<string | null>) {
  const [signed, setSigned] = useState<{ path: string; url: string | null } | null>(null);
  const path = proof?.type === "file" && !proof.url ? proof.path : undefined;

  useEffect(() => {
    if (!path || !resolveUrl || !proof) return;
    let cancelled = false;
    resolveUrl(proof).then((url) => {
      if (!cancelled) setSigned({ path, url });
    });
    return () => {
      cancelled = true;
    };
  }, [path, resolveUrl, proof]);

  return signed && signed.path === path ? signed.url : null;
}

const LINK_CLASS =
  "font-semibold text-accent-700 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-700";

/**
 * A submitted proof as the reviewer needs it: a link proof is clickable so it can actually be
 * checked. The stored value is re-validated here rather than trusted, so a link saved before
 * validation existed (or written by some other client) can never become a javascript: href.
 */
export function ProofView({
  proof,
  className = "",
  resolveUrl,
}: {
  proof: Proof | null;
  className?: string;
  /** Signs a stored file's download link; the store's resolveProofUrl. */
  resolveUrl?: (proof: Proof) => Promise<string | null>;
}) {
  const signedUrl = useSignedUrl(proof, resolveUrl);
  if (!proof) return null;
  const base = `break-words whitespace-pre-line text-sm text-text ${className}`;

  if (proof.type === "link") {
    const link = normalizeProofLink(proof.value);
    if (link.ok) {
      return (
        <div className={base}>
          Link:{" "}
          <a href={link.value} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {proof.value}
          </a>
        </div>
      );
    }
  }

  const fileUrl = proof.type === "file" ? trustedFileUrl(proof.url ?? signedUrl) : null;
  if (fileUrl) {
    const isObjectUrl = fileUrl.startsWith("blob:");
    return (
      <div className={base}>
        File:{" "}
        <a
          href={fileUrl}
          // A signed URL is cross-origin, where `download` is ignored, so it opens in a new tab.
          {...(isObjectUrl
            ? { download: proof.value }
            : { target: "_blank", rel: "noopener noreferrer" })}
          className={LINK_CLASS}
        >
          {proof.value}
        </a>
      </div>
    );
  }

  return <div className={base}>{proofSummary(proof)}</div>;
}
