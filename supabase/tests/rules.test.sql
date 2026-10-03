-- The database half of the rules in app/src/lib/rules.ts. Run with: npx supabase test db
-- Each block signs in as someone (leader, member or outsider) and checks what the RPCs, RLS and
-- grants let them do.

begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- Three accounts. The profile trigger names them from the sign-up metadata.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'lea@example.com', '{"display_name": "Lea"}'),
  ('22222222-2222-2222-2222-222222222222', 'mo@example.com', '{"display_name": "Mo"}'),
  ('33333333-3333-3333-3333-333333333333', 'oz@example.com', '{"display_name": "Oz"}');

create function pg_temp.sign_in(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

select is((select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Mo', 'sign-up creates a profile named from the form');

-- Lea creates a group and leads it; Mo joins with the code.
set local role authenticated;
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select set_config('t.gid', public.create_group('Capstone')::text, true);
select set_config('t.code', (select invite_code from public.groups where id = current_setting('t.gid')::uuid), true);
select set_config('t.t1', public.create_task(current_setting('t.gid')::uuid, 'Write intro', now() + interval '5 days')::text, true);
select set_config('t.t2', public.create_task(current_setting('t.gid')::uuid, 'Final edit', now() + interval '10 hours')::text, true);
select set_config('t.t3', public.create_task(current_setting('t.gid')::uuid, 'Slides', now() + interval '6 days')::text, true);

select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select is(public.join_group(lower(current_setting('t.code'))), current_setting('t.gid')::uuid,
  'a member joins with the invite code, in any case');
select is((select role::text from public.group_members where user_id = auth.uid()), 'member',
  'joining makes you a member, not a leader');
select throws_ok($$ select public.join_group('NOPE1234') $$, 'invite code not found',
  'an unknown invite code is refused');
select throws_ok($$ select public.create_task(current_setting('t.gid')::uuid, 'Sneaky', now() + interval '3 days') $$,
  'only the leader can do that', 'a member cannot add tasks');

-- Claiming.
select lives_ok($$ select public.claim_task(current_setting('t.t1')::bigint) $$, 'a member claims an open task');
select is((select assignee from public.tasks where id = current_setting('t.t1')::bigint),
  '22222222-2222-2222-2222-222222222222'::uuid, 'the claimed task goes to the caller');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.claim_task(current_setting('t.t1')::bigint) $$, 'task is not open',
  'a claimed task cannot be claimed again');

-- No direct writes, whatever the client sends.
select throws_ok($$ update public.tasks set status = 'accepted' where id = current_setting('t.t1')::bigint $$,
  '42501', null, 'tasks cannot be updated directly');
select throws_ok($$ insert into public.activity_log (group_id, text) values (current_setting('t.gid')::uuid, 'fake') $$,
  '42501', null, 'the log cannot be written directly');

-- An outsider sees nothing and can do nothing.
select pg_temp.sign_in('33333333-3333-3333-3333-333333333333');
select is((select count(*) from public.tasks), 0::bigint, 'an outsider reads no tasks');
select is((select count(*) from public.groups), 0::bigint, 'an outsider reads no groups');
select throws_ok($$ select public.claim_task(current_setting('t.t3')::bigint) $$, 'task not found',
  'an outsider cannot claim, and cannot tell the task exists');

-- Proof and review.
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.submit_proof(current_setting('t.t1')::bigint, 'text', 'Done') $$,
  'you cannot submit proof for this task', 'only the assignee submits proof');
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.submit_proof(current_setting('t.t1')::bigint, 'link', 'javascript:alert(1)') $$,
  '23514', null, 'a non-http link is refused by the column check');
select lives_ok($$ select public.submit_proof(current_setting('t.t1')::bigint, 'link', 'https://docs.example.com/intro') $$,
  'the assignee submits a link');
select throws_ok($$ select public.accept_task(current_setting('t.t1')::bigint) $$,
  'you cannot review this task', 'a member cannot accept work');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.reject_task(current_setting('t.t1')::bigint, '   ') $$,
  'a reason of up to 500 characters is required', 'a blank reject reason is refused');
select lives_ok($$ select public.accept_task(current_setting('t.t1')::bigint) $$, 'the leader accepts');
select is((select text from public.activity_log order by id desc limit 1),
  'Lea accepted "Write intro" (Mo, on time)', 'the log names who did what, and whether it was on time');

-- Swaps.
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select public.claim_task(current_setting('t.t2')::bigint);
select throws_ok($$ select public.request_swap(current_setting('t.t2')::bigint, 'release') $$,
  'swaps close 48 hours before the deadline', 'no swaps inside the 48-hour window');
select public.claim_task(current_setting('t.t3')::bigint);
select lives_ok($$ select public.request_swap(current_setting('t.t3')::bigint, 'targeted', '11111111-1111-1111-1111-111111111111') $$,
  'a targeted swap request goes in');
select throws_ok($$ select public.request_swap(current_setting('t.t3')::bigint, 'release') $$,
  'you cannot swap this task', 'a second request waits for the first to be decided');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select public.resolve_swap((select id from public.swap_requests where status = 'pending'), true);
select is((select assignee from public.tasks where id = current_setting('t.t3')::bigint),
  '11111111-1111-1111-1111-111111111111'::uuid, 'approving hands the task to the named teammate');

-- Share links.
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.create_share_link(current_setting('t.gid')::uuid) $$,
  'only the leader can do that', 'a member cannot create share links');
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select set_config('t.token', public.create_share_link(current_setting('t.gid')::uuid), true);
reset role;
set local role anon;
select is(public.get_shared_group(current_setting('t.token')) ->> 'name', 'Capstone',
  'anyone with a live link sees the group');
reset role;
set local role authenticated;
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select public.revoke_share_link(current_setting('t.token'));
reset role;
set local role anon;
select is(public.get_shared_group(current_setting('t.token')), null,
  'a revoked link shows nothing, the same as an unknown one');

select * from finish();
rollback;
