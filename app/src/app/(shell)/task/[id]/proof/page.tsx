"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ProofType } from "@/lib/types";

const OPTIONS: { value: ProofType; label: string }[] = [
  { value: "file", label: "File" },
  { value: "link", label: "Link" },
  { value: "text", label: "Text" },
];

export default function SubmitProofPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { tasks, submitProof } = useStore();
  const id = Number(params.id);
  const task = tasks.find((t) => t.id === id);

  const [proofType, setProofType] = useState<ProofType>("link");
  const [proofValue, setProofValue] = useState("");

  if (!task) {
    return <div className="text-sm text-neutral-700">This task no longer exists.</div>;
  }

  function changeType(t: ProofType) {
    setProofType(t);
    setProofValue("");
  }

  function handleSubmit() {
    if (!proofValue.trim()) return;
    submitProof(id, { type: proofType, value: proofValue.trim() });
    router.push(`/task/${id}`);
  }

  const inputClass =
    "w-full rounded-[var(--radius-base)] border border-neutral-300 bg-surface p-3 text-sm text-text outline-none focus:border-accent-500";

  return (
    <div>
      <Card elevated className="mb-[18px]">
        <div className="font-heading text-[17px] text-text">{task.title}</div>
        <div className="mt-1 text-sm text-neutral-700">Attach evidence this task is done.</div>
      </Card>

      <SegmentedControl options={OPTIONS} value={proofType} onChange={changeType} />

      <div className="mb-[18px] flex flex-col gap-1.5">
        {proofType === "file" && (
          <>
            <label className="text-xs font-semibold text-neutral-700">Upload file</label>
            <input
              type="file"
              onChange={(e) => setProofValue(e.target.files?.[0]?.name ?? "")}
              className={`${inputClass} file:mr-3 file:rounded-[var(--radius-pill)] file:border-0 file:bg-accent-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-800`}
            />
          </>
        )}
        {proofType === "link" && (
          <>
            <label className="text-xs font-semibold text-neutral-700">Link</label>
            <input
              type="text"
              inputMode="url"
              placeholder="https://"
              value={proofValue}
              onChange={(e) => setProofValue(e.target.value)}
              className={inputClass}
            />
          </>
        )}
        {proofType === "text" && (
          <>
            <label className="text-xs font-semibold text-neutral-700">Notes</label>
            <textarea
              rows={4}
              placeholder="Describe what you did..."
              value={proofValue}
              onChange={(e) => setProofValue(e.target.value)}
              className={inputClass}
            />
          </>
        )}
      </div>

      <Button block disabled={!proofValue.trim()} onClick={handleSubmit}>
        Submit for review
      </Button>
    </div>
  );
}
