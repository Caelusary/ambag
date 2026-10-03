-- Local development only: `npx supabase db reset` runs this after the migrations. It never runs
-- against the cloud project. Two accounts already in one group, so both sides of every rule can be
-- tried straight away:
--
--   lea@ambag.test / ambag-local-1   leads "Local test group"
--   mo@ambag.test  / ambag-local-1   member of it

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('ambag-local-1', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('display_name', u.name),
  now(), now(), '', '', '', ''
from (values
  ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'lea@ambag.test', 'Lea'),
  ('aaaaaaaa-0000-4000-8000-000000000002'::uuid, 'mo@ambag.test', 'Mo')
) as u (id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@ambag.test';

-- The group, built the way the app builds it: through the RPCs, signed in as each person.
do $$
declare
  gid uuid;
begin
  perform set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
  gid := public.create_group('Local test group');
  perform public.create_task(gid, 'Outline the report', now() + interval '6 days');
  perform public.create_task(gid, 'Find five sources', now() + interval '4 days');
  perform public.create_task(gid, 'Print the poster', now() + interval '30 hours');

  perform set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}', true);
  perform public.join_group((select invite_code from public.groups where id = gid));
  perform public.claim_task((select id from public.tasks where title = 'Find five sources'));
end;
$$;
