"use client";

import { useState } from "react";
import { useNow } from "@/lib/clock";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FIELD_CONTROL, FieldLabel } from "@/components/ui/fields";

const TITLE_MAX = 120;

/** A datetime-local value in the viewer's own time zone. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * A task's title and deadline, shared by adding a task and editing one. Mounted only while open,
 * so each opening starts from `initial`.
 */
export function TaskDialog({
  heading,
  confirmLabel,
  initial,
  onConfirm,
  onClose,
}: {
  heading: string;
  confirmLabel: string;
  initial: { title: string; deadlineAt: number };
  onConfirm: (title: string, deadlineAt: number) => void;
  onClose: () => void;
}) {
  const now = useNow();
  const [title, setTitle] = useState(initial.title);
  const [deadline, setDeadline] = useState(() => toLocalInput(initial.deadlineAt));

  const deadlineAt = deadline ? new Date(deadline).getTime() : NaN;
  const titleOk = title.trim().length > 0 && title.trim().length <= TITLE_MAX;
  const deadlineOk = Number.isFinite(deadlineAt) && deadlineAt > now;

  function confirm() {
    if (!titleOk || !deadlineOk) return;
    onConfirm(title.trim(), deadlineAt);
  }

  return (
    <Dialog
      title={heading}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!titleOk || !deadlineOk} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="task-title">Title</FieldLabel>
          <input
            id="task-title"
            autoFocus
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${FIELD_CONTROL} bg-bg`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="task-deadline">Deadline</FieldLabel>
          <input
            id="task-deadline"
            type="datetime-local"
            min={toLocalInput(now)}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-describedby="task-deadline-hint"
            className={`${FIELD_CONTROL} bg-bg`}
          />
          <p id="task-deadline-hint" className="text-xs text-neutral-700">
            {deadline && !deadlineOk
              ? "Pick a time in the future."
              : "Swaps close 48 hours before this."}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
