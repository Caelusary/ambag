-- Ambag's whole backend: groups, tasks, swaps, the activity log and share links.
--
-- Every rule in app/src/lib/rules.ts is enforced here too, because the browser can be skipped.
-- Tables are readable by members of the group through RLS, and nothing is writable directly:
-- each change goes through one SECURITY DEFINER function below, which checks the caller and the
-- rule, makes the change and writes the log line in one transaction.

-- ---------------------------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------------------------

create type public.member_role as enum ('leader', 'member');
create type public.task_status as enum ('open', 'assigned', 'seen', 'submitted', 'accepted', 'rejected');
create type public.proof_type as enum ('file', 'link', 'text');
create type public.swap_mode as enum ('targeted', 'release');
create type public.swap_status as enum ('pending', 'approved', 'denied');

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- One leader per group: the leader is who reviews, so two would make the rules ambiguous.
create unique index group_members_one_leader on public.group_members (group_id) where role = 'leader';
create index group_members_user on public.group_members (user_id);

create table public.tasks (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status public.task_status not null default 'open',
  assignee uuid references public.profiles (id),
  deadline_at timestamptz not null,
  proof_type public.proof_type,
  -- The link, the note, or the file's name. Same limits as app/src/lib/validation.ts.
  proof_value text check (char_length(proof_value) <= 2048),
  -- File proofs only: the object's path in the private "proofs" bucket.
  proof_path text,
  submitted_at timestamptz,
  reject_reason text check (char_length(reject_reason) <= 500),
  created_at timestamptz not null default now(),
  check (proof_type <> 'link' or proof_value ~* '^https?://'),
  check ((status = 'open') = (assignee is null))
);

create index tasks_group on public.tasks (group_id);

create table public.swap_requests (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user uuid not null references public.profiles (id),
  mode public.swap_mode not null,
  target_user uuid references public.profiles (id),
  status public.swap_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((mode = 'targeted') = (target_user is not null))
);

-- At most one pending request per task.
create unique index swap_requests_one_pending on public.swap_requests (task_id) where status = 'pending';
create index swap_requests_group on public.swap_requests (group_id);

create table public.activity_log (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  actor uuid references public.profiles (id),
  text text not null,
  created_at timestamptz not null default now()
);

create index activity_log_group on public.activity_log (group_id, id desc);

create table public.share_links (
  token text primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index share_links_group on public.share_links (group_id);

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- SECURITY DEFINER so RLS policies can call them without recursing into group_members' own policy.
create function public.is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members where group_id = p_group and user_id = auth.uid()
  );
$$;

create function public.is_leader(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid() and role = 'leader'
  );
$$;

create function public.display_name(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select display_name from public.profiles where id = p_user;
$$;

-- 128 random bits, base64url: unguessable, unlike an id or a counter.
create function public.random_token() returns text
language sql volatile set search_path = '' as $$
  select rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
$$;

-- Eight characters with no look-alikes (no 0/O, 1/I/L), easy to read out in a group chat.
create function public.random_invite_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;
  return code;
end;
$$;

create function public.log_activity(p_group uuid, p_text text) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity_log (group_id, actor, text) values (p_group, auth.uid(), p_text);
$$;

-- Every function below starts here: who is calling, and are they signed in.
create function public.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  return auth.uid();
end;
$$;

-- A task, locked for the rest of the transaction, that the caller's group owns.
create function public.lock_task(p_task bigint) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if not found or not public.is_member(t.group_id) then
    raise exception 'task not found' using errcode = 'P0002';
  end if;
  return t;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Profiles: one per sign-up, named from the sign-up form
-- ---------------------------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------------------------

create function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  gid uuid;
begin
  insert into public.groups (name, invite_code, created_by)
  values (btrim(p_name), public.random_invite_code(), me)
  returning id into gid;
  insert into public.group_members (group_id, user_id, role) values (gid, me, 'leader');
  perform public.log_activity(gid, public.display_name(me) || ' created the group');
  return gid;
end;
$$;

create function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  gid uuid;
begin
  select id into gid from public.groups where invite_code = upper(btrim(p_code));
  if gid is null then
    raise exception 'invite code not found' using errcode = 'P0002';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, me)
  on conflict do nothing;
  if found then
    perform public.log_activity(gid, public.display_name(me) || ' joined the group');
  end if;
  return gid;
end;
$$;

create function public.rotate_invite_code(p_group uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  code text := public.random_invite_code();
begin
  perform public.require_user();
  if not public.is_leader(p_group) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  update public.groups set invite_code = code where id = p_group;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------------------------

create function public.create_task(p_group uuid, p_title text, p_deadline timestamptz) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  tid bigint;
begin
  perform public.require_user();
  if not public.is_leader(p_group) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  insert into public.tasks (group_id, title, deadline_at)
  values (p_group, btrim(p_title), p_deadline)
  returning id into tid;
  perform public.log_activity(
    p_group, public.display_name(auth.uid()) || ' added "' || btrim(p_title) || '"'
  );
  return tid;
end;
$$;

-- rules.ts canClaim: only an open task, and it goes to the caller.
create function public.claim_task(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
begin
  if t.status <> 'open' then
    raise exception 'task is not open' using errcode = '23514';
  end if;
  update public.tasks set status = 'assigned', assignee = me where id = p_task;
  perform public.log_activity(t.group_id, public.display_name(me) || ' called dibs on "' || t.title || '"');
end;
$$;

-- Opening your own assigned task is what moves it to "Seen". Anything else is a quiet no-op.
create function public.mark_seen(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
begin
  update public.tasks set status = 'seen'
  where id = p_task and assignee = me and status = 'assigned';
end;
$$;

-- rules.ts canSubmitProof: the assignee, while assigned, seen or rejected.
create function public.submit_proof(
  p_task bigint, p_type public.proof_type, p_value text, p_path text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
begin
  if t.assignee is distinct from me or t.status not in ('assigned', 'seen', 'rejected') then
    raise exception 'you cannot submit proof for this task' using errcode = '42501';
  end if;
  if p_type = 'text' and char_length(p_value) > 2000 then
    raise exception 'note is too long' using errcode = '22001';
  end if;
  if p_type = 'file' and (
    p_path is null
    or p_path not like t.group_id::text || '/' || t.id::text || '/%'
    or not exists (select 1 from storage.objects where bucket_id = 'proofs' and name = p_path)
  ) then
    raise exception 'uploaded file not found' using errcode = 'P0002';
  end if;
  update public.tasks
  set status = 'submitted',
      proof_type = p_type,
      proof_value = p_value,
      proof_path = case when p_type = 'file' then p_path end,
      submitted_at = now(),
      reject_reason = null
  where id = p_task;
  perform public.log_activity(t.group_id, public.display_name(me) || ' submitted proof for "' || t.title || '"');
end;
$$;

-- rules.ts canReview: the leader, and only submitted work.
create function public.accept_task(p_task bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
  timing text;
  whose text;
begin
  if not public.is_leader(t.group_id) or t.status <> 'submitted' then
    raise exception 'you cannot review this task' using errcode = '42501';
  end if;
  update public.tasks set status = 'accepted' where id = p_task;
  -- Judged by when the proof went in: a slow review doesn't make someone late.
  timing := case when t.submitted_at <= t.deadline_at then 'on time' else 'late' end;
  whose := case when t.assignee = me then 'their own task' else public.display_name(t.assignee) end;
  perform public.log_activity(
    t.group_id,
    public.display_name(me) || ' accepted "' || t.title || '" (' || whose || ', ' || timing || ')'
  );
end;
$$;

create function public.reject_task(p_task bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
  reason text := btrim(p_reason);
begin
  if not public.is_leader(t.group_id) or t.status <> 'submitted' then
    raise exception 'you cannot review this task' using errcode = '42501';
  end if;
  if reason = '' or char_length(reason) > 500 then
    raise exception 'a reason of up to 500 characters is required' using errcode = '23514';
  end if;
  update public.tasks set status = 'rejected', reject_reason = reason where id = p_task;
  perform public.log_activity(
    t.group_id, public.display_name(me) || ' rejected "' || t.title || '": ' || reason
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Swaps
-- ---------------------------------------------------------------------------------------------

-- rules.ts canRequestSwap + the 48-hour cutoff, judged by the database clock.
create function public.request_swap(p_task bigint, p_mode public.swap_mode, p_target uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  t public.tasks := public.lock_task(p_task);
begin
  if t.assignee is distinct from me or t.status not in ('assigned', 'seen')
     or exists (select 1 from public.swap_requests where task_id = p_task and status = 'pending') then
    raise exception 'you cannot swap this task' using errcode = '42501';
  end if;
  if t.deadline_at - now() < interval '48 hours' then
    raise exception 'swaps close 48 hours before the deadline' using errcode = '23514';
  end if;
  if p_mode = 'targeted' and (
    p_target is null or p_target = me
    or not exists (select 1 from public.group_members where group_id = t.group_id and user_id = p_target)
  ) then
    raise exception 'pick a teammate in this group' using errcode = '23514';
  end if;
  -- The partial unique index turns a second pending request into an error.
  insert into public.swap_requests (task_id, group_id, from_user, mode, target_user)
  values (p_task, t.group_id, me, p_mode, case when p_mode = 'targeted' then p_target end);
  perform public.log_activity(
    t.group_id,
    case when p_mode = 'targeted'
      then public.display_name(me) || ' requested a swap with ' || public.display_name(p_target) || ' for "' || t.title || '"'
      else public.display_name(me) || ' asked to release "' || t.title || '" back to the pool'
    end
  );
end;
$$;

-- rules.ts swapApprovalBlocker, repeated at decision time because a request can go stale.
create function public.resolve_swap(p_request bigint, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  r public.swap_requests;
  t public.tasks;
begin
  select * into r from public.swap_requests where id = p_request for update;
  if not found or not public.is_leader(r.group_id) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'this request was already decided' using errcode = '23514';
  end if;
  t := public.lock_task(r.task_id);

  if p_approve then
    if t.assignee is distinct from r.from_user or t.status not in ('assigned', 'seen')
       or t.deadline_at - now() < interval '48 hours' then
      raise exception 'this request no longer applies' using errcode = '23514';
    end if;
    if r.mode = 'targeted' then
      update public.tasks set assignee = r.target_user, status = 'assigned' where id = t.id;
      perform public.log_activity(
        t.group_id,
        public.display_name(me) || ' approved the swap: "' || t.title || '" moves from '
          || public.display_name(r.from_user) || ' to ' || public.display_name(r.target_user)
      );
    else
      update public.tasks set assignee = null, status = 'open' where id = t.id;
      perform public.log_activity(
        t.group_id, public.display_name(me) || ' approved releasing "' || t.title || '" back to the pool'
      );
    end if;
  else
    perform public.log_activity(
      t.group_id,
      public.display_name(me) || ' denied ' || public.display_name(r.from_user)
        || '''s swap request for "' || t.title || '"'
    );
  end if;

  update public.swap_requests
  set status = case when p_approve then 'approved'::public.swap_status else 'denied'::public.swap_status end,
      decided_at = now()
  where id = p_request;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Share links: the professor's read-only view
-- ---------------------------------------------------------------------------------------------

create function public.create_share_link(p_group uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  tok text := public.random_token();
begin
  if not public.is_leader(p_group) then
    raise exception 'only the leader can do that' using errcode = '42501';
  end if;
  insert into public.share_links (token, group_id, created_by) values (tok, p_group, me);
  perform public.log_activity(p_group, public.display_name(me) || ' created a new read-only share link');
  return tok;
end;
$$;

create function public.revoke_share_link(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_user();
  gid uuid;
begin
  select group_id into gid from public.share_links where token = p_token and revoked_at is null;
  if gid is null or not public.is_leader(gid) then
    raise exception 'share link not found' using errcode = 'P0002';
  end if;
  update public.share_links set revoked_at = now() where token = p_token;
  perform public.log_activity(gid, public.display_name(me) || ' revoked a read-only share link');
end;
$$;

-- The one thing anonymous visitors can call. It returns only what the professor's view shows,
-- and an unknown token and a revoked one get the same null, so tokens can't be probed.
create function public.get_shared_group(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', g.name,
    'members', coalesce((
      select jsonb_agg(p.display_name order by m.joined_at)
      from public.group_members m join public.profiles p on p.id = m.user_id
      where m.group_id = g.id
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'status', t.status))
      from public.tasks t where t.group_id = g.id
    ), '[]'::jsonb),
    'log', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'ts', l.created_at, 'text', l.text) order by l.id desc)
      from (
        select * from public.activity_log a where a.group_id = g.id order by a.id desc limit 200
      ) l
    ), '[]'::jsonb)
  )
  from public.share_links s
  join public.groups g on g.id = s.group_id
  where s.token = p_token and s.revoked_at is null;
$$;

-- ---------------------------------------------------------------------------------------------
-- Row-level security: members read their own groups, and nobody writes directly
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tasks enable row level security;
alter table public.swap_requests enable row level security;
alter table public.activity_log enable row level security;
alter table public.share_links enable row level security;

create policy "read own profile and groupmates" on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
);

create policy "members read their groups" on public.groups for select to authenticated
using (public.is_member(id));

create policy "members read the roster" on public.group_members for select to authenticated
using (public.is_member(group_id));

create policy "members read tasks" on public.tasks for select to authenticated
using (public.is_member(group_id));

create policy "members read swaps" on public.swap_requests for select to authenticated
using (public.is_member(group_id));

create policy "members read the log" on public.activity_log for select to authenticated
using (public.is_member(group_id));

create policy "leader reads share links" on public.share_links for select to authenticated
using (public.is_leader(group_id));

-- The project doesn't expose new tables automatically, so grant exactly what's needed: reads.
grant usage on schema public to anon, authenticated;
revoke all on public.profiles, public.groups, public.group_members, public.tasks,
  public.swap_requests, public.activity_log, public.share_links from anon, authenticated;
grant select on public.profiles, public.groups, public.group_members, public.tasks,
  public.swap_requests, public.activity_log, public.share_links to authenticated;

-- Functions are executable by PUBLIC by default. Lock them all down, then open the RPCs.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_member(uuid), public.is_leader(uuid),
  public.create_group(text), public.join_group(text), public.rotate_invite_code(uuid),
  public.create_task(uuid, text, timestamptz), public.claim_task(bigint), public.mark_seen(bigint),
  public.submit_proof(bigint, public.proof_type, text, text),
  public.accept_task(bigint), public.reject_task(bigint, text),
  public.request_swap(bigint, public.swap_mode, uuid), public.resolve_swap(bigint, boolean),
  public.create_share_link(uuid), public.revoke_share_link(text)
to authenticated;
grant execute on function public.get_shared_group(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Live updates: teammates see claims, submissions and reviews without reloading
-- ---------------------------------------------------------------------------------------------

alter publication supabase_realtime add table public.tasks, public.swap_requests, public.activity_log,
  public.group_members;

-- ---------------------------------------------------------------------------------------------
-- Proof files: a private bucket, one folder per group, readable by that group only
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs', 'proofs', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- Paths are <group id>/<task id>/<random>-<file name>; the first folder decides who can touch it.
create policy "members upload proofs" on storage.objects for insert to authenticated
with check (
  bucket_id = 'proofs'
  and public.is_member(((storage.foldername(name))[1])::uuid)
);

create policy "members read proofs" on storage.objects for select to authenticated
using (
  bucket_id = 'proofs'
  and public.is_member(((storage.foldername(name))[1])::uuid)
);
