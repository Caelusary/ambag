import { proofSummary, type Proof } from "@/lib/types";
import { normalizeProofLink } from "@/lib/validation";

/**
 * A submitted proof as the reviewer needs it: a link proof is clickable so it can actually be
 * checked. The stored value is re-validated here rather than trusted, so a link saved before
 * validation existed (or written by some other client) can never become a javascript: href.
 */
const SIGNED_PROOF_PREFIX = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/proofs/`
  : null;

function trustedFileUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("blob:")) return url;
  if (SIGNED_PROOF_PREFIX && url.startsWith(SIGNED_PROOF_PREFIX)) return url;
  return null;
}

export function ProofView({ proof, className = "" }: { proof: Proof | null; className?: string }) {
  if (!proof) return null;
  const base = `break-words whitespace-pre-line text-sm text-text ${className}`;

  if (proof.type === "link") {
    const link = normalizeProofLink(proof.value);
    if (link.ok) {
      return (
        <div className={base}>
          Link:{" "}
          <a
            href={link.value}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-700 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-700"
          >
            {proof.value}
          </a>
        </div>
      );
    }
  }

  // An uploaded file is a link this app made: an object URL in the demo, or a signed URL from this
  // project's private bucket for a real group. Anything else is shown as text only.
  const fileUrl = proof.type === "file" ? trustedFileUrl(proof.url) : null;
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
          className="font-semibold text-accent-700 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-700"
        >
          {proof.value}
        </a>
      </div>
    );
  }

  return <div className={base}>{proofSummary(proof)}</div>;
}
