"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useNow } from "@/lib/clock";
import { HOUR_MS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FIELD_CONTROL, FieldLabel } from "@/components/ui/fields";

const TITLE_MAX = 120;

/** A datetime-local value in the viewer's own time zone. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** The leader's way to put work in the pool: a title and a deadline. */
export function AddTask() {
  const { role, createTask } = useStore();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");

  if (role !== "leader") return null;

  function openDialog() {
    setTitle("");
    // A week out, on the hour: a sensible default that's well outside the swap window.
    setDeadline(toLocalInput(Math.ceil((now + 7 * 24 * HOUR_MS) / HOUR_MS) * HOUR_MS));
    setOpen(true);
  }

  const deadlineAt = deadline ? new Date(deadline).getTime() : NaN;
  const titleOk = title.trim().length > 0 && title.trim().length <= TITLE_MAX;
  const deadlineOk = Number.isFinite(deadlineAt) && deadlineAt > now;

  function confirm() {
    if (!titleOk || !deadlineOk) return;
    createTask(title.trim(), deadlineAt);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-neutral-400 text-sm font-semibold text-neutral-800 transition-colors hover:border-accent-500 hover:bg-accent-100 hover:text-accent-800"
      >
        <Plus size={16} strokeWidth={2.75} aria-hidden="true" />
        Add task
      </button>

      {open && (
        <Dialog
          title="Add a task"
          onClose={() => setOpen(false)}
          actions={
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!titleOk || !deadlineOk} onClick={confirm}>
                Add to pool
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
      )}
    </>
  );
}
