"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "./supabase/client";
import { fetchGroupSnapshot, type GroupSnapshot } from "./group-data";
import { StoreContext, nameIn, type StoreValue } from "./store-context";
import type { Proof, SwapMode } from "./types";

/**
 * Messages the database's own rule checks raise (see the migration). They're ours, not user input,
 * so they're safe to show. Anything else becomes a generic message, so a raw Postgres error never
 * reaches the page.
 */
const KNOWN_ERRORS: Record<string, string> = {
  "task is not open": "Someone else claimed that task first.",
  "you cannot submit proof for this task": "That task isn't yours to submit any more.",
  "uploaded file not found": "The file didn't finish uploading. Try again.",
  "note is too long": "That note is too long.",
  "you cannot review this task": "That submission has already been reviewed.",
  "a reason of up to 500 characters is required": "Give a reason of up to 500 characters.",
  "you cannot swap this task": "That task can't be swapped any more.",
  "swaps close 48 hours before the deadline": "Swaps close 48 hours before the deadline.",
  "pick a teammate in this group": "Pick a teammate in this group.",
  "this request was already decided": "That swap request was already decided.",
  "this request no longer applies": "That swap request no longer applies.",
  "only the leader can do that": "Only the group leader can do that.",
  "share link not found": "That share link was already revoked.",
  "task not found": "That task no longer exists.",
};
const GENERIC_ERROR = "That didn't go through. Check your connection and try again.";

function friendly(error: { message?: string; code?: string } | null): string {
  if (!error) return GENERIC_ERROR;
  // A second pending swap trips the one-pending-request index.
  if (error.code === "23505") return "There's already a swap request waiting on that task.";
  return (error.message && KNOWN_ERRORS[error.message]) || GENERIC_ERROR;
}

/** Keeps the file's own name readable in storage while stripping anything path-like. */
function storageSafeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
}

/**
 * A real group's store. It starts from the snapshot the server rendered with, sends every change
 * through the database's RPCs (which re-check the rules), and refetches after each change and
 * whenever a teammate changes something, so every open tab stays current.
 */
export function LiveStoreProvider({
  initial,
  userId,
  children,
}: {
  initial: GroupSnapshot;
  userId: string;
  children: ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const groupId = initial.group.id;
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  // Drops a slow response that lands after a newer one.
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const next = await fetchGroupSnapshot(supabase, groupId);
      if (next && request === latestRequest.current) setSnapshot(next);
    } catch {
      if (request === latestRequest.current) setError(GENERIC_ERROR);
    }
  }, [supabase, groupId]);

  // While one of your own actions is in flight, and briefly after its refetch, a Realtime event is
  // almost always that same change coming back. Refetching for it would double every read.
  const ownCallsInFlight = useRef(0);
  const ownRefreshDoneAt = useRef(0);
  const ECHO_WINDOW_MS = 800;

  // Teammates' changes arrive over Realtime. Bursts (a review writes a task and a log line) are
  // folded into one refetch.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const isEcho =
        ownCallsInFlight.current > 0 || Date.now() - ownRefreshDoneAt.current < ECHO_WINDOW_MS;
      if (isEcho) return;
      clearTimeout(timer);
      timer = setTimeout(refresh, 250);
    };
    const filter = `group_id=eq.${groupId}`;
    const channel = supabase
      .channel(`group:${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter }, schedule)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "swap_requests", filter },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter },
        schedule,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, groupId, refresh]);

  /** Calls one RPC, reports a refusal, and refetches either way. */
  const call = useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      ownCallsInFlight.current += 1;
      try {
        const { error: rpcError } = await supabase.rpc(fn, args);
        if (rpcError) setError(friendly(rpcError));
        await refresh();
      } finally {
        ownCallsInFlight.current -= 1;
        ownRefreshDoneAt.current = Date.now();
      }
    },
    [supabase, refresh],
  );

  const { members, tasks, swaps, log, shareLinks } = snapshot;
  const role = members.find((m) => m.id === userId)?.role ?? "member";
  const memberName = useCallback((id: string | null) => nameIn(members, id), [members]);
  const getTask = useCallback((id: number) => tasks.find((t) => t.id === id), [tasks]);

  const value = useMemo<StoreValue>(
    () => ({
      currentUser: userId,
      role,
      switchableAccounts: [],
      // There's only one of you in a real group.
      setCurrentUser: () => {},
      members,
      memberName,
      tasks,
      log,
      swaps,
      shareLinks,
      error,
      clearError: () => setError(null),
      getTask,
      createTask: (title: string, deadlineAt: number) =>
        void call("create_task", {
          p_group: groupId,
          p_title: title,
          p_deadline: new Date(deadlineAt).toISOString(),
        }),
      claimTask: (id: number) => void call("claim_task", { p_task: id }),
      markSeen: (id: number) => void call("mark_seen", { p_task: id }),
      submitProof: (id: number, proof: Proof, file?: File) =>
        void (async () => {
          if (proof.type !== "file") {
            await call("submit_proof", { p_task: id, p_type: proof.type, p_value: proof.value });
            return;
          }
          if (!file) return setError("Choose a file.");
          // <group>/<task>/<random>-<name>: the first folder is what storage RLS checks.
          const path = `${groupId}/${id}/${crypto.randomUUID()}-${storageSafeName(file.name)}`;
          const { error: uploadError } = await supabase.storage
            .from("proofs")
            .upload(path, file, { contentType: file.type });
          if (uploadError) return setError("The file couldn't be uploaded. Try again.");
          await call("submit_proof", {
            p_task: id,
            p_type: "file",
            p_value: proof.value,
            p_path: path,
          });
        })(),
      acceptTask: (id: number) => void call("accept_task", { p_task: id }),
      rejectTask: (id: number, reason: string) =>
        void call("reject_task", { p_task: id, p_reason: reason }),
      sendSwapRequest: (id: number, mode: SwapMode, target: string | null) =>
        void call("request_swap", {
          p_task: id,
          p_mode: mode,
          p_target: mode === "targeted" ? target : null,
        }),
      resolveSwap: (requestId: number, approve: boolean) =>
        void call("resolve_swap", { p_request: requestId, p_approve: approve }),
      createShareLink: () => void call("create_share_link", { p_group: groupId }),
      revokeShareLink: (token: string) => void call("revoke_share_link", { p_token: token }),
    }),
    [
      userId,
      role,
      members,
      memberName,
      tasks,
      log,
      swaps,
      shareLinks,
      error,
      getTask,
      call,
      groupId,
      supabase,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
