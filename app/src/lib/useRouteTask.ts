"use client";

import { useParams } from "next/navigation";
import { useStore } from "./store";

/** Resolves the task named by the /task/[id] route segment; task is undefined if the id is unknown. */
export function useRouteTask() {
  const params = useParams<{ id: string }>();
  const { getTask } = useStore();
  const id = Number(params.id);
  return { id, task: getTask(id) };
}
