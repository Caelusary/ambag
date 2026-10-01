import { proofSummary, type Proof } from "@/lib/types";
import { normalizeProofLink } from "@/lib/validation";

/**
 * A submitted proof as the reviewer needs it: a link proof is clickable so it can actually be
 * checked. The stored value is re-validated here rather than trusted, so a link saved before
 * validation existed (or written by some other client) can never become a javascript: href.
 */
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

  // An uploaded file is an object URL this app created; anything else is shown as text only.
  if (proof.type === "file" && proof.url?.startsWith("blob:")) {
    return (
      <div className={base}>
        File:{" "}
        <a
          href={proof.url}
          download={proof.value}
          className="font-semibold text-accent-700 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-700"
        >
          {proof.value}
        </a>
      </div>
    );
  }

  return <div className={base}>{proofSummary(proof)}</div>;
}
