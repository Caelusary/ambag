"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store-context";
import { useSpace } from "@/lib/space";
import { useRouteTask } from "@/lib/useRouteTask";
import { TaskNotFound } from "@/components/task/TaskNotFound";
import { Notice } from "@/components/ui/feedback";
import { FIELD_CONTROL, FieldLabel } from "@/components/ui/fields";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { canSubmitProof } from "@/lib/rules";
import type { ProofType } from "@/lib/types";
import {
  PROOF_FILE_ACCEPT,
  PROOF_LINK_MAX,
  PROOF_TEXT_MAX,
  validateProof,
  validateProofFile,
} from "@/lib/validation";

const OPTIONS: { value: ProofType; label: string }[] = [
  { value: "file", label: "File" },
  { value: "link", label: "Link" },
  { value: "text", label: "Text" },
];

export default function SubmitProofPage() {
  const router = useRouter();
  const { currentUser, submitProof } = useStore();
  const { base } = useSpace();
  const { id, task } = useRouteTask();

  const [proofType, setProofType] = useState<ProofType>("link");
  const [proofValue, setProofValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!task) return <TaskNotFound />;

  if (!canSubmitProof(task, currentUser)) {
    return (
      <Notice>Proof can only be submitted by the assignee, before the task is reviewed.</Notice>
    );
  }

  function changeType(t: ProofType) {
    setProofType(t);
    setProofValue("");
    setFile(null);
    setError(null);
  }

  // Checked as soon as it's picked, so a wrong file is caught before the submit button.
  function changeFile(picked: File | null) {
    setFile(picked);
    setProofValue(picked?.name ?? "");
    const result = picked ? validateProofFile(picked) : null;
    setError(result && !result.ok ? result.error : null);
  }

  function changeValue(v: string) {
    setProofValue(v);
    setError(null);
  }

  function handleSubmit() {
    if (proofType === "file") {
      const checked = file ? validateProofFile(file) : null;
      if (!file || !checked?.ok) {
        setError(checked && !checked.ok ? checked.error : "Choose a file.");
        return;
      }
      // The demo keeps the file in this browser session behind an object URL; a real group
      // uploads the file itself to private storage.
      submitProof(id, { type: "file", value: checked.value, url: URL.createObjectURL(file) }, file);
      router.push(`${base}/task/${id}`);
      return;
    }
    const result = validateProof(proofType, proofValue);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    submitProof(id, result.value);
    router.push(`${base}/task/${id}`);
  }

  const inputClass = `${FIELD_CONTROL} bg-surface`;

  // A form reads best at a single-column width, so it stays narrow even on desktop.
  return (
    <div className="lg:max-w-[560px]">
      <Card elevated className="mb-5">
        <div className="font-heading text-[17px] text-text">{task.title}</div>
        <div className="mt-1 text-sm text-neutral-700">Attach evidence this task is done.</div>
      </Card>

      <SegmentedControl
        label="Proof type"
        options={OPTIONS}
        value={proofType}
        onChange={changeType}
      />

      <div className="mb-5 flex flex-col gap-1.5">
        {proofType === "file" && (
          <>
            <FieldLabel htmlFor="proof-file">Upload file</FieldLabel>
            <input
              id="proof-file"
              type="file"
              accept={PROOF_FILE_ACCEPT}
              aria-invalid={error != null}
              aria-describedby={error ? "proof-error" : "proof-file-hint"}
              onChange={(e) => changeFile(e.target.files?.[0] ?? null)}
              className={`${inputClass} file:mr-3 file:rounded-[var(--radius-pill)] file:border-0 file:bg-accent-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-800`}
            />
            <div id="proof-file-hint" className="text-[11px] text-neutral-700">
              PDF, image, Word, PowerPoint, Excel or text, up to 10 MB.
            </div>
          </>
        )}
        {proofType === "link" && (
          <>
            <FieldLabel htmlFor="proof-link">Link</FieldLabel>
            <input
              id="proof-link"
              type="text"
              inputMode="url"
              placeholder="https://"
              maxLength={PROOF_LINK_MAX}
              aria-invalid={error != null}
              aria-describedby={error ? "proof-error" : undefined}
              value={proofValue}
              onChange={(e) => changeValue(e.target.value)}
              className={inputClass}
            />
          </>
        )}
        {proofType === "text" && (
          <>
            <FieldLabel htmlFor="proof-text">Notes</FieldLabel>
            <textarea
              id="proof-text"
              rows={4}
              placeholder="Describe what you did..."
              maxLength={PROOF_TEXT_MAX}
              aria-invalid={error != null}
              aria-describedby={error ? "proof-error" : undefined}
              value={proofValue}
              onChange={(e) => changeValue(e.target.value)}
              className={inputClass}
            />
            <div className="text-right text-[11px] text-neutral-700">
              {proofValue.length}/{PROOF_TEXT_MAX}
            </div>
          </>
        )}
        {error && (
          <div id="proof-error" role="alert" className="text-xs text-danger-700">
            {error}
          </div>
        )}
      </div>

      <Button
        block
        disabled={!proofValue.trim() || (proofType === "file" && error != null)}
        onClick={handleSubmit}
      >
        Submit for review
      </Button>
    </div>
  );
}
