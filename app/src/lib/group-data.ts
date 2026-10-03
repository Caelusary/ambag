import type { SupabaseClient } from "@supabase/supabase-js";
import type { LogEntry, Member, ShareLink, SwapRequest, Task } from "./types";

/** Everything one group's pages show, in the shapes the store and the pages already use. */
export interface GroupSnapshot {
  group: { id: string; name: string; inviteCode: string };
  members: Member[];
  tasks: Task[];
  swaps: SwapRequest[];
  log: LogEntry[];
  shareLinks: ShareLink[];
  /** When this was read: the first frame renders deadlines against it, on server and client. */
  fetchedAt: number;
}

const LOG_LIMIT = 200;
// Long enough to open a proof during a review, short enough that a leaked URL soon goes stale.
const SIGNED_URL_SECONDS = 60 * 60;

const ms = (iso: string | null) => (iso == null ? null : Date.parse(iso));

/**
 * Reads a group through whichever client is passed: the server's during the first render, the
 * browser's on every refresh after. RLS decides what comes back, so a non-member gets null.
 */
export async function fetchGroupSnapshot(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupSnapshot | null> {
  const [group, members, tasks, swaps, log, links] = await Promise.all([
    supabase.from("groups").select("id, name, invite_code").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, role, joined_at, profiles(display_name)")
      .eq("group_id", groupId)
      .order("joined_at"),
    supabase.from("tasks").select("*").eq("group_id", groupId).order("id"),
    supabase
      .from("swap_requests")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("id, created_at, text")
      .eq("group_id", groupId)
      // By id, not time: entries written in one transaction share a timestamp.
      .order("id", { ascending: false })
      .limit(LOG_LIMIT),
    // Only the leader can read these; for anyone else RLS returns an empty list.
    supabase
      .from("share_links")
      .select("token, created_at, revoked_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
  ]);

  const failed = [group, members, tasks, swaps, log, links].find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't load the group: ${failed.error.message}`);
  if (!group.data) return null;

  const pending = new Set(
    (swaps.data ?? []).filter((s) => s.status === "pending").map((s) => s.task_id as number),
  );

  // File proofs live in a private bucket, so each one needs a signed URL to be downloadable.
  const filePaths = (tasks.data ?? [])
    .filter((t) => t.proof_type === "file" && t.proof_path)
    .map((t) => t.proof_path as string);
  const signed = new Map<string, string>();
  if (filePaths.length > 0) {
    const { data } = await supabase.storage
      .from("proofs")
      .createSignedUrls(filePaths, SIGNED_URL_SECONDS);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  return {
    fetchedAt: Date.now(),
    group: { id: group.data.id, name: group.data.name, inviteCode: group.data.invite_code },
    members: (members.data ?? []).map((m) => {
      // The embedded profile comes back as an object for a many-to-one relation.
      const profile = m.profiles as unknown as { display_name: string } | null;
      return { id: m.user_id, name: profile?.display_name ?? "Someone", role: m.role };
    }),
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignee: t.assignee,
      deadlineAt: Date.parse(t.deadline_at),
      proof: t.proof_type
        ? {
            type: t.proof_type,
            value: t.proof_value ?? "",
            url: t.proof_path ? signed.get(t.proof_path) : undefined,
          }
        : null,
      submittedAt: ms(t.submitted_at),
      rejectReason: t.reject_reason,
      swapPending: pending.has(t.id),
    })),
    swaps: (swaps.data ?? []).map((s) => ({
      id: s.id,
      taskId: s.task_id,
      from: s.from_user,
      mode: s.mode,
      target: s.target_user,
      status: s.status,
      ts: Date.parse(s.created_at),
    })),
    log: (log.data ?? []).map((l) => ({ id: l.id, ts: Date.parse(l.created_at), text: l.text })),
    shareLinks: (links.data ?? []).map((l) => ({
      token: l.token,
      createdAt: Date.parse(l.created_at),
      revokedAt: ms(l.revoked_at),
    })),
  };
}

/** The groups the signed-in user belongs to, newest first, for the switcher. */
export async function fetchMyGroups(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("joined_at, groups(id, name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw new Error(`Couldn't load your groups: ${error.message}`);
  return (data ?? [])
    .map((row) => row.groups as unknown as { id: string; name: string } | null)
    .filter((g): g is { id: string; name: string } => g != null);
}
