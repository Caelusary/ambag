-- Leaders edit and remove tasks; members leave groups; leaders hand the role to someone else.
-- Same pattern as the first migration: SECURITY DEFINER functions check the caller and the rule,
-- make the change and write the log line in one transaction. Clients still get no direct writes.

-- ---------------------------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------------------------

-- A new title and deadline. Accepted work is history, so it stays as it was reviewed.
create function public.update_task(p_task bigint, p_title text, p_deadline timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
  v_title text := btrim(p_title);
begin
  if not public.is_leader(t.group_id) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  if t.status = 'accepted' then
    raise exception 'accepted work cannot be edited' using errcode = '23514';
  end if;
  if char_length(v_title) not between 1 and 120 then
    raise exception 'a title of up to 120 characters is required' using errcode = '23514';
  end if;
  if p_deadline <= now() then
    raise exception 'the deadline must be in the future' using errcode = '23514';
  end if;
  update public.tasks set title = v_title, deadline_at = p_deadline where id = p_task;
  perform public.log_activity(
    t.group_id,
    public.display_name(me) || ' edited "' || v_title || '"'
      || case when t.title <> v_title then ' (was "' || t.title || '")' else '' end
  );
end;
$$;

-- Only work nobody has handed in yet: removing a submission or accepted work would erase proof.
create function public.delete_task(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
begin
  if not public.is_leader(t.group_id) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  if t.status not in ('open', 'assigned', 'seen') then
    raise exception 'work that has been handed in cannot be removed' using errcode = '23514';
  end if;
  delete from public.tasks where id = p_task;
  perform public.log_activity(t.group_id, public.display_name(me) || ' removed "' || t.title || '"');
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------------------------

-- The leader passes the role on; they stay in the group as a member.
create function public.transfer_leadership(p_group uuid, p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
begin
  if not public.is_leader(p_group) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  if p_to = me or not exists (
    select 1 from public.group_members where group_id = p_group and user_id = p_to
  ) then
    raise exception 'pick a teammate in this group' using errcode = '23514';
  end if;
  -- Demote first: the one-leader index is checked after each statement.
  update public.group_members set role = 'member' where group_id = p_group and user_id = me;
  update public.group_members set role = 'leader' where group_id = p_group and user_id = p_to;
  perform public.log_activity(
    p_group, public.display_name(me) || ' made ' || public.display_name(p_to) || ' the leader'
  );
end;
$$;

-- A member leaves. Their unfinished work goes back to the pool so nothing is stranded with someone
-- who can no longer see it; accepted work stays credited to them. A leader hands over first.
create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
begin
  if not public.is_member(p_group) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if public.is_leader(p_group) then
    raise exception 'hand the leader role to someone first' using errcode = '23514';
  end if;
  update public.swap_requests set status = 'denied', decided_at = now()
  where group_id = p_group and status = 'pending' and (from_user = me or target_user = me);
  update public.tasks
  set status = 'open', assignee = null, proof_type = null, proof_value = null, proof_path = null,
      submitted_at = null, reject_reason = null
  where group_id = p_group and assignee = me and status <> 'accepted';
  -- Logged while still a member, so the line carries their name.
  perform public.log_activity(p_group, public.display_name(me) || ' left the group');
  delete from public.group_members where group_id = p_group and user_id = me;
end;
$$;

revoke execute on function
  public.update_task(bigint, text, timestamptz), public.delete_task(bigint),
  public.transfer_leadership(uuid, uuid), public.leave_group(uuid)
from public, anon;
grant execute on function
  public.update_task(bigint, text, timestamptz), public.delete_task(bigint),
  public.transfer_leadership(uuid, uuid), public.leave_group(uuid)
to authenticated;
