-- Editing and removing tasks, leaving a group and handing over the leader role.
-- Run with: npx supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'lea@example.com', '{"display_name": "Lea"}'),
  ('22222222-2222-2222-2222-222222222222', 'mo@example.com', '{"display_name": "Mo"}');

create function pg_temp.sign_in(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select set_config('t.gid', public.create_group('Capstone')::text, true);
select set_config('t.t1', public.create_task(current_setting('t.gid')::uuid, 'Outline', now() + interval '5 days')::text, true);
select set_config('t.t2', public.create_task(current_setting('t.gid')::uuid, 'Sources', now() + interval '5 days')::text, true);
select set_config('t.t3', public.create_task(current_setting('t.gid')::uuid, 'Poster', now() + interval '5 days')::text, true);
select set_config('t.code', (select invite_code from public.groups where id = current_setting('t.gid')::uuid), true);

select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select public.join_group(current_setting('t.code'));

-- Editing.
select throws_ok($$ select public.update_task(current_setting('t.t1')::bigint, 'Mine now', now() + interval '6 days') $$,
  'only the leader can do that', 'a member cannot edit tasks');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.update_task(current_setting('t.t1')::bigint, '  Report outline ', now() + interval '6 days') $$,
  'the leader renames and re-dates a task');
select is((select title from public.tasks where id = current_setting('t.t1')::bigint), 'Report outline',
  'the new title is trimmed and saved');
select is((select text from public.activity_log order by id desc limit 1), 'Lea edited "Report outline" (was "Outline")',
  'the log records the rename');
select throws_ok($$ select public.update_task(current_setting('t.t1')::bigint, 'Late', now() - interval '1 hour') $$,
  'the deadline must be in the future', 'a past deadline is refused');
select throws_ok($$ select public.update_task(current_setting('t.t1')::bigint, '   ', now() + interval '2 days') $$,
  'a title of up to 120 characters is required', 'a blank title is refused');

-- Removing.
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select public.claim_task(current_setting('t.t2')::bigint);
select public.submit_proof(current_setting('t.t2')::bigint, 'text', 'Ten sources.');
select throws_ok($$ select public.delete_task(current_setting('t.t3')::bigint) $$,
  'only the leader can do that', 'a member cannot remove tasks');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.delete_task(current_setting('t.t2')::bigint) $$,
  'work that has been handed in cannot be removed', 'submitted work cannot be removed');
select lives_ok($$ select public.delete_task(current_setting('t.t3')::bigint) $$, 'the leader removes an open task');
select is((select count(*) from public.tasks where id = current_setting('t.t3')::bigint), 0::bigint,
  'the removed task is gone');

-- Handing over and leaving.
select throws_ok($$ select public.leave_group(current_setting('t.gid')::uuid) $$,
  'hand the leader role to someone first', 'the leader cannot just leave');
select throws_ok($$ select public.transfer_leadership(current_setting('t.gid')::uuid, '11111111-1111-1111-1111-111111111111') $$,
  'pick a teammate in this group', 'the leader cannot hand the role to themselves');
select lives_ok($$ select public.transfer_leadership(current_setting('t.gid')::uuid, '22222222-2222-2222-2222-222222222222') $$,
  'the leader hands the role to a member');
select is((select role::text from public.group_members where user_id = '22222222-2222-2222-2222-222222222222'), 'leader',
  'the member is now the leader');
select is((select role::text from public.group_members where user_id = '11111111-1111-1111-1111-111111111111'), 'member',
  'the old leader stays on as a member');

select public.claim_task(current_setting('t.t1')::bigint);
select lives_ok($$ select public.leave_group(current_setting('t.gid')::uuid) $$, 'a member leaves');
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select is((select status::text || ':' || coalesce(assignee::text, 'none') from public.tasks where id = current_setting('t.t1')::bigint),
  'open:none', 'the leaver''s unfinished task goes back to the pool');
select is((select text from public.activity_log where text like '%left%' order by id desc limit 1), 'Lea left the group',
  'the log records who left');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select is((select count(*) from public.tasks), 0::bigint, 'someone who left can no longer read the group');

select * from finish();
rollback;
