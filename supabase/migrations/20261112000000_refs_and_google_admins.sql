-- Ref routing (?ref=sags / ?ref=drups), personalised invites, and Google sign-in admins.
-- Safe to run more than once.

-- 1. Which side's link the guest came from ------------------------------------------
alter table public.rsvps  add column if not exists ref_code text;
alter table public.guests add column if not exists ref_code text not null default 'sags';
create index if not exists rsvps_ref_code_idx on public.rsvps(ref_code);

do $$ begin
  alter table public.rsvps add constraint rsvps_ref_code_format check (ref_code is null or ref_code ~ '^[a-z0-9_-]{1,24}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.guests add constraint guests_ref_code_format check (ref_code ~ '^[a-z0-9_-]{1,24}$');
exception when duplicate_object then null; end $$;

-- Ref → WhatsApp routing, editable from the admin Settings → Share links screen.
insert into public.site_settings(setting_key, value, is_public) values
 ('refs', '{"sags":{"label":"Sagar''s side","side":"groom","whatsapp":"917387322548"},"drups":{"label":"Dhrupti''s side","side":"bride","whatsapp":"918828476929"}}'::jsonb, true)
on conflict (setting_key) do nothing;

-- 2. RSVP with ref + invite code ------------------------------------------------------
create or replace function public.submit_rsvp_v2(
  p_guest_name text, p_phone text, p_email text, p_attendance text, p_party_size integer,
  p_event_ids uuid[], p_dietary_notes text, p_message text, p_preferred_language text,
  p_whatsapp_consent boolean, p_ref_code text default 'sags', p_invite_code text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_guest uuid;
  v_ref text := lower(coalesce(nullif(trim(p_ref_code), ''), 'sags'));
begin
  if v_ref !~ '^[a-z0-9_-]{1,24}$' then v_ref := 'sags'; end if;
  if length(coalesce(p_email, '')) > 160 or length(coalesce(p_phone, '')) > 24 then raise exception 'Contact details are too long'; end if;
  v_id := public.submit_rsvp(p_guest_name, p_phone, p_email, p_attendance, p_party_size, p_event_ids,
                             p_dietary_notes, p_message, p_preferred_language, p_whatsapp_consent);
  if nullif(trim(p_invite_code), '') is not null then
    select g.id into v_guest from public.guests g where g.invite_code = upper(trim(p_invite_code));
  end if;
  update public.rsvps set ref_code = v_ref, guest_id = coalesce(v_guest, guest_id) where id = v_id;
  return v_id;
end; $$;
revoke all on function public.submit_rsvp_v2(text,text,text,text,integer,uuid[],text,text,text,boolean,text,text) from public;
grant execute on function public.submit_rsvp_v2(text,text,text,text,integer,uuid[],text,text,text,boolean,text,text) to anon, authenticated;

-- Personalised greeting for /?c=CODE links. Returns only the name, never contact details.
create or replace function public.get_invite(p_code text)
returns table(full_name text, household_label text, ref_code text)
language sql stable security definer set search_path = '' as $$
  select g.full_name, g.household_label, g.ref_code from public.guests g
  where g.invite_code = upper(trim(p_code)) and length(trim(p_code)) between 4 and 24 limit 1;
$$;
revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

-- 3. Google sign-in admins: allow-list by email -----------------------------------------
create table if not exists public.admin_allowlist(
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'admin' check (role in ('super_admin','admin')),
  display_name text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now());
alter table public.admin_allowlist enable row level security;

drop policy if exists "Admins read allowlist" on public.admin_allowlist;
create policy "Admins read allowlist" on public.admin_allowlist for select to authenticated using (public.is_admin());
drop policy if exists "Super admins manage allowlist" on public.admin_allowlist;
create policy "Super admins manage allowlist" on public.admin_allowlist for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Called by the admin page right after Google sign-in.
-- Creates the profile when the verified Google email is on the allow-list and keeps the role in sync.
create or replace function public.claim_admin()
returns setof public.profiles language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_verified boolean;
  v_name text;
  v_allow public.admin_allowlist;
begin
  if v_uid is null then return; end if;
  select lower(u.email), u.email_confirmed_at is not null, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
    into v_email, v_verified, v_name from auth.users u where u.id = v_uid;
  select * into v_allow from public.admin_allowlist a where a.email = v_email;

  if found and v_verified then
    insert into public.profiles(id, display_name, role)
    values (v_uid, coalesce(v_allow.display_name, v_name, v_email), v_allow.role)
    on conflict (id) do update set role = excluded.role, updated_at = now();
  end if;
  return query select * from public.profiles p where p.id = v_uid;
end; $$;
revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated;

-- Removing an email from the allow-list removes that person's admin profile too.
create or replace function public.revoke_admin_on_allowlist_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.profiles p using auth.users u where u.id = p.id and lower(u.email) = old.email;
  return old;
end; $$;
drop trigger if exists admin_allowlist_revoke on public.admin_allowlist;
create trigger admin_allowlist_revoke after delete on public.admin_allowlist
  for each row execute function public.revoke_admin_on_allowlist_delete();

-- Bring existing admins onto the allow-list so nobody is locked out.
insert into public.admin_allowlist(email, role, display_name)
select lower(u.email), p.role, p.display_name from public.profiles p join auth.users u on u.id = p.id
where u.email is not null
on conflict (email) do nothing;

-- First super admin (run once, with your Google email):
--   insert into public.admin_allowlist(email, role) values ('you@gmail.com', 'super_admin')
--   on conflict (email) do update set role = 'super_admin';
