"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store-context";
import { useSpace } from "@/lib/space";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TaskDialog } from "./TaskDialog";

/**
 * The leader's edit and remove controls on a task. Accepted work can't be edited, and only work
 * nobody has handed in can be removed, matching the database's own checks.
 */
export function TaskAdmin({ task }: { task: Task }) {
  const { role, updateTask, deleteTask } = useStore();
  const { base } = useSpace();
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "remove" | null>(null);

  if (role !== "leader") return null;
  const canEdit = task.status !== "accepted";
  const canRemove = task.status === "open" || task.status === "assigned" || task.status === "seen";
  if (!canEdit && !canRemove) return null;

  return (
    <div className="flex gap-2.5 border-t border-neutral-200 pt-3">
      {canEdit && (
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDialog("edit")}>
          Edit task
        </Button>
      )}
      {canRemove && (
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => setDialog("remove")}
        >
          Remove task
        </Button>
      )}

      {dialog === "edit" && (
        <TaskDialog
          heading="Edit task"
          confirmLabel="Save changes"
          initial={{ title: task.title, deadlineAt: task.deadlineAt }}
          onConfirm={(title, deadlineAt) => {
            updateTask(task.id, title, deadlineAt);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "remove" && (
        <Dialog
          title="Remove this task?"
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setDialog(null)}>
                Keep it
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  deleteTask(task.id);
                  router.push(`${base}/pool`);
                }}
              >
                Remove task
              </Button>
            </>
          }
        >
          <p>
            &ldquo;{task.title}&rdquo; leaves the pool for good. The activity log keeps a line
            saying you removed it.
          </p>
        </Dialog>
      )}
    </div>
  );
}
