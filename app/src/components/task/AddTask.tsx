"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useNow } from "@/lib/clock";
import { HOUR_MS } from "@/lib/constants";
import { TaskDialog } from "./TaskDialog";

/** The leader's way to put work in the pool: a title and a deadline. */
export function AddTask() {
  const { role, createTask } = useStore();
  const now = useNow();
  const [open, setOpen] = useState(false);

  if (role !== "leader") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-neutral-400 text-sm font-semibold text-neutral-800 transition-colors hover:border-accent-500 hover:bg-accent-100 hover:text-accent-800"
      >
        <Plus size={16} strokeWidth={2.75} aria-hidden="true" />
        Add task
      </button>

      {open && (
        <TaskDialog
          heading="Add a task"
          confirmLabel="Add to pool"
          // A week out, on the hour: a sensible default that's well outside the swap window.
          initial={{
            title: "",
            deadlineAt: Math.ceil((now + 7 * 24 * HOUR_MS) / HOUR_MS) * HOUR_MS,
          }}
          onConfirm={(title, deadlineAt) => {
            createTask(title, deadlineAt);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
