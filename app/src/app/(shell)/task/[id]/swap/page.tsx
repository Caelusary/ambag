"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/clock";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatDeadline, hoursUntil } from "@/lib/types";

type SwapMode = "targeted" | "release";
type SwapStep = "choose" | "confirm" | "done";

const MODE_OPTIONS: { value: SwapMode; label: string }[] = [
  { value: "targeted", label: "Targeted" },
  { value: "release", label: "Release" },
];

export default function SwapRequestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { tasks, members, currentUser, sendSwapRequest } = useStore();
  const id = Number(params.id);
  const task = tasks.find((t) => t.id === id);

  const otherMembers = members.filter((m) => m !== currentUser);
  const [mode, setMode] = useState<SwapMode>("targeted");
  const [target, setTarget] = useState(otherMembers[0] ?? "");
  const [step, setStep] = useState<SwapStep>("choose");

  // Recompute the deadline window live so a valid request can become blocked.
  const now = useNow();

  if (!task) {
    return <div className="text-sm text-neutral-700">This task no longer exists.</div>;
  }

  const blocked = hoursUntil(task.deadlineAt, now) < 48;

  function handleConfirm() {
    sendSwapRequest(id, mode, mode === "targeted" ? target : null);
    setStep("done");
  }

  const confirmText =
    mode === "targeted"
      ? `Request a swap with ${target} for "${task.title}"?`
      : `Release "${task.title}" back to the pool for anyone to claim?`;

  return (
    <div>
      <Card elevated className="mb-[18px]">
        <div className="font-heading text-[17px] text-text">{task.title}</div>
        <div className="mt-1 text-[13px] text-neutral-700">
          Due {formatDeadline(task.deadlineAt, now)}
        </div>
      </Card>

      {blocked && step === "choose" && (
        <>
          <Card bordered className="mb-[18px]">
            <div className="text-sm text-accent-700">
              Swap requests close 48 hours before the deadline — this task is inside that window, so
              it can&apos;t be swapped.
            </div>
          </Card>
          <Button block variant="secondary" disabled>
            Request swap unavailable
          </Button>
        </>
      )}

      {!blocked && step === "choose" && (
        <>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

          {mode === "targeted" && (
            <div className="mb-[18px] flex flex-col gap-2.5">
              {otherMembers.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-base)] border p-3 text-sm transition-colors ${
                    target === m
                      ? "border-accent-500 bg-accent-100 text-accent-800"
                      : "border-neutral-300 bg-surface text-text"
                  }`}
                >
                  <input
                    type="radio"
                    name="swapTarget"
                    aria-label={m}
                    checked={target === m}
                    onChange={() => setTarget(m)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      target === m ? "border-accent-500" : "border-neutral-400"
                    }`}
                  >
                    {target === m && <span className="h-2 w-2 rounded-full bg-accent-500" />}
                  </span>
                  {m}
                </label>
              ))}
            </div>
          )}

          {mode === "release" && (
            <div className="mb-[18px] text-[13px] text-neutral-700">
              The task returns to the pool for any teammate to claim.
            </div>
          )}

          <Button block onClick={() => setStep("confirm")}>
            Send request
          </Button>
        </>
      )}

      {step === "confirm" && (
        <>
          <Card className="mb-[18px]">
            <div className="text-sm text-text">{confirmText}</div>
          </Card>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("choose")}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        </>
      )}

      {step === "done" && (
        <>
          <Card tinted="accent-2" className="mb-[18px]">
            <div className="text-sm text-accent-2-800">
              Request sent and logged. Waiting on the leader to approve.
            </div>
          </Card>
          <Button block onClick={() => router.push(`/task/${id}`)}>
            Done
          </Button>
        </>
      )}
    </div>
  );
}
