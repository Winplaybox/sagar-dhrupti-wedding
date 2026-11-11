-- Family invite links (who invited whom), three roles (super_admin / admin / user),
-- side-specific events and editable custom sections.
-- Run AFTER 20261112000000_refs_and_google_admins.sql. Safe to run more than once.

alter table public.rsvps  add column if not exists ref_code text;
alter table public.guests add column if not exists ref_code text default 'sags';

-- 0. Roles -----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('super_admin','admin','user'));

-- Everyone who may sign in with Google, keyed by email.
create table if not exists public.members(
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'user' check (role in ('super_admin','admin','user')),
  display_name text,
  side text check (side in ('groom','bride')),
  relation text,
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  user_id uuid unique references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
alter table public.members enable row level security;

-- Carry over the earlier allow-list and any existing admin profiles.
do $$ begin
  if to_regclass('public.admin_allowlist') is not null then
    insert into public.members(email, role, display_name)
    select email, role, display_name from public.admin_allowlist on conflict (email) do nothing;
  end if;
end $$;
insert into public.members(email, role, display_name, user_id)
select lower(u.email), p.role, p.display_name, u.id from public.profiles p join auth.users u on u.id = p.id
where u.email is not null
on conflict (email) do update set user_id = excluded.user_id;
drop table if exists public.admin_allowlist cascade;
drop function if exists public.revoke_admin_on_allowlist_delete();

create or replace function public.my_side() returns text language sql stable security definer set search_path = '' as $$
  select m.side from public.members m where m.user_id = (select auth.uid());
$$;
create or replace function public.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid()));
$$;

drop policy if exists "Super admins manage members" on public.members;
create policy "Super admins manage members" on public.members for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "Admins read members" on public.members;
create policy "Admins read members" on public.members for select to authenticated using (public.is_admin());
drop policy if exists "Admins add users" on public.members;
create policy "Admins add users" on public.members for insert to authenticated with check (public.is_admin() and role = 'user');
drop policy if exists "Admins edit users" on public.members;
create policy "Admins edit users" on public.members for update to authenticated
  using (public.is_admin() and role = 'user') with check (public.is_admin() and role = 'user');
drop policy if exists "Admins remove users" on public.members;
create policy "Admins remove users" on public.members for delete to authenticated using (public.is_admin() and role = 'user');
drop policy if exists "Members read themselves" on public.members;
create policy "Members read themselves" on public.members for select to authenticated using (user_id = (select auth.uid()));

-- Keep profiles in step with members.
create or replace function public.sync_member_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.profiles p where p.id = old.user_id
       or p.id in (select u.id from auth.users u where lower(u.email) = old.email);
    return old;
  end if;
  if new.user_id is not null then
    update public.profiles set role = new.role, display_name = coalesce(new.display_name, display_name), updated_at = now() where id = new.user_id;
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists members_sync_profile on public.members;
create trigger members_sync_profile before update on public.members for each row execute function public.sync_member_profile();
drop trigger if exists members_remove_profile on public.members;
create trigger members_remove_profile after delete on public.members for each row execute function public.sync_member_profile();

-- 1. Invite links: one per family member (or several) -----------------------------------
create table if not exists public.referrers(
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]{2,32}$'),
  display_name text not null check (length(display_name) between 1 and 80),
  relation text,
  side text not null check (side in ('groom','bride')),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text check (owner_email is null or owner_email = lower(owner_email)),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create index if not exists referrers_owner_idx on public.referrers(owner_user_id);
alter table public.referrers enable row level security;

insert into public.referrers(code, display_name, relation, side, whatsapp) values
  ('sags',  'Sagar',   'groom', 'groom', '917387322548'),
  ('drups', 'Dhrupti', 'bride', 'bride', '918828476929')
on conflict (code) do nothing;
-- Links saved in the earlier "refs" setting.
insert into public.referrers(code, display_name, side, whatsapp)
select r.key, coalesce(r.value->>'label', r.key), coalesce(r.value->>'side', 'groom'), regexp_replace(r.value->>'whatsapp', '\D', '', 'g')
from public.site_settings s, jsonb_each(s.value) r
where s.setting_key = 'refs' and r.key ~ '^[a-z0-9_-]{2,32}$' and regexp_replace(coalesce(r.value->>'whatsapp',''), '\D', '', 'g') ~ '^[0-9]{10,15}$'
on conflict (code) do nothing;

drop policy if exists "Admins manage referrers" on public.referrers;
create policy "Admins manage referrers" on public.referrers for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read own referrers" on public.referrers;
create policy "Users read own referrers" on public.referrers for select to authenticated using (owner_user_id = (select auth.uid()));
drop policy if exists "Users create own referrers" on public.referrers;
create policy "Users create own referrers" on public.referrers for insert to authenticated
  with check (public.is_member() and owner_user_id = (select auth.uid()) and side = public.my_side());
drop policy if exists "Users edit own referrers" on public.referrers;
create policy "Users edit own referrers" on public.referrers for update to authenticated
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()) and side = public.my_side());
drop policy if exists "Users delete own referrers" on public.referrers;
create policy "Users delete own referrers" on public.referrers for delete to authenticated using (owner_user_id = (select auth.uid()));

-- Public lookup of one link (the invitation page). Never lists all links.
create or replace function public.get_referrer(p_code text)
returns table(code text, display_name text, relation text, side text, whatsapp text)
language sql stable security definer set search_path = '' as $$
  select r.code, r.display_name, r.relation, r.side, r.whatsapp from public.referrers r
  where r.code = lower(trim(p_code)) and r.is_active limit 1;
$$;
revoke all on function public.get_referrer(text) from public;
grant execute on function public.get_referrer(text) to anon, authenticated;

-- 2. Who invited each RSVP / guest -------------------------------------------------------
alter table public.rsvps  add column if not exists referrer_id uuid references public.referrers(id) on delete set null;
alter table public.guests add column if not exists referrer_id uuid references public.referrers(id) on delete set null;
create index if not exists rsvps_referrer_idx on public.rsvps(referrer_id);
create index if not exists guests_referrer_idx on public.guests(referrer_id);
alter table public.rsvps  drop constraint if exists rsvps_ref_code_format;
alter table public.guests drop constraint if exists guests_ref_code_format;
update public.rsvps r set referrer_id = f.id from public.referrers f where r.referrer_id is null and f.code = coalesce(r.ref_code, 'sags');
update public.guests g set referrer_id = f.id from public.referrers f where g.referrer_id is null and f.code = coalesce(g.ref_code, 'sags');

drop policy if exists "Users read RSVPs from own links" on public.rsvps;
create policy "Users read RSVPs from own links" on public.rsvps for select to authenticated
  using (referrer_id in (select r.id from public.referrers r where r.owner_user_id = (select auth.uid())));
drop policy if exists "Users manage guests on own links" on public.guests;
create policy "Users manage guests on own links" on public.guests for all to authenticated
  using (referrer_id in (select r.id from public.referrers r where r.owner_user_id = (select auth.uid())))
  with check (referrer_id in (select r.id from public.referrers r where r.owner_user_id = (select auth.uid())));

create or replace function public.submit_rsvp_v2(
  p_guest_name text, p_phone text, p_email text, p_attendance text, p_party_size integer,
  p_event_ids uuid[], p_dietary_notes text, p_message text, p_preferred_language text,
  p_whatsapp_consent boolean, p_ref_code text default 'sags', p_invite_code text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_guest uuid; v_ref public.referrers;
begin
  if length(coalesce(p_email, '')) > 160 or length(coalesce(p_phone, '')) > 24 then raise exception 'Contact details are too long'; end if;
  select * into v_ref from public.referrers r where r.code = lower(trim(coalesce(p_ref_code, ''))) and r.is_active;
  if not found then select * into v_ref from public.referrers r where r.code = 'sags'; end if;
  v_id := public.submit_rsvp(p_guest_name, p_phone, p_email, p_attendance, p_party_size, p_event_ids,
                             p_dietary_notes, p_message, p_preferred_language, p_whatsapp_consent);
  if nullif(trim(p_invite_code), '') is not null then
    select g.id into v_guest from public.guests g where g.invite_code = upper(trim(p_invite_code));
  end if;
  update public.rsvps set ref_code = coalesce(v_ref.code, 'sags'), referrer_id = v_ref.id, guest_id = coalesce(v_guest, guest_id) where id = v_id;
  return v_id;
end; $$;
revoke all on function public.submit_rsvp_v2(text,text,text,text,integer,uuid[],text,text,text,boolean,text,text) from public;
grant execute on function public.submit_rsvp_v2(text,text,text,text,integer,uuid[],text,text,text,boolean,text,text) to anon, authenticated;

create or replace function public.get_invite(p_code text)
returns table(full_name text, household_label text, ref_code text)
language sql stable security definer set search_path = '' as $$
  select g.full_name, g.household_label, coalesce(r.code, g.ref_code) from public.guests g
  left join public.referrers r on r.id = g.referrer_id
  where g.invite_code = upper(trim(p_code)) and length(trim(p_code)) between 4 and 24 limit 1;
$$;

-- 3. Sign-in: any member (super_admin / admin / user) -----------------------------------
drop function if exists public.claim_admin();
create or replace function public.claim_access()
returns setof public.profiles language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text; v_verified boolean; v_name text; v_m public.members;
begin
  if v_uid is null then return; end if;
  select lower(u.email), u.email_confirmed_at is not null, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
    into v_email, v_verified, v_name from auth.users u where u.id = v_uid;
  select * into v_m from public.members m where m.email = v_email;
  if found and v_verified then
    insert into public.profiles(id, display_name, role) values (v_uid, coalesce(v_m.display_name, v_name, v_email), v_m.role)
    on conflict (id) do update set role = excluded.role, updated_at = now();
    update public.members set user_id = v_uid, display_name = coalesce(display_name, v_name) where email = v_email and user_id is distinct from v_uid;
    update public.referrers set owner_user_id = v_uid where owner_email = v_email and owner_user_id is null;
  elsif not found then
    delete from public.profiles where id = v_uid;
  end if;
  return query select * from public.profiles p where p.id = v_uid;
end; $$;
revoke all on function public.claim_access() from public, anon;
grant execute on function public.claim_access() to authenticated;

-- Self-service settings for any signed-in member.
create or replace function public.update_my_member(p_display_name text, p_whatsapp text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_wa text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
begin
  if v_wa is not null and v_wa !~ '^[0-9]{10,15}$' then raise exception 'WhatsApp number needs 10 to 15 digits with country code'; end if;
  update public.members set display_name = nullif(trim(p_display_name), ''), whatsapp = v_wa where user_id = auth.uid();
  update public.profiles set display_name = nullif(trim(p_display_name), ''), updated_at = now() where id = auth.uid();
end; $$;
revoke all on function public.update_my_member(text, text) from public, anon;
grant execute on function public.update_my_member(text, text) to authenticated;

-- 4. Events per side --------------------------------------------------------------------
alter table public.events add column if not exists audience text not null default 'both';
do $$ begin
  alter table public.events add constraint events_audience_check check (audience in ('both','groom','bride'));
exception when duplicate_object then null; end $$;
alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check check (event_type in ('wedding','reception','haldi','mehndi','sangeet','vastu','puja','other'));
insert into public.events(slug, title, event_type, event_date, audience, sort_order, is_published) values
  ('groom-vastu', '{"en":"Vastu Puja","gu":"વાસ્તુ પૂજન","hi":"वास्तु पूजन","mr":"वास्तु पूजन"}', 'vastu', date '2026-12-25', 'groom', -20, true),
  ('groom-haldi', '{"en":"Haldi","gu":"પીઠી","hi":"हल्दी","mr":"हळद"}', 'haldi', date '2027-02-01', 'groom', -10, true)
on conflict (slug) do nothing;

-- 5. Custom sections on the invitation -------------------------------------------------
create table if not exists public.site_sections(
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'text' check (kind in ('text','image','quote','list')),
  title jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,
  image_url text,
  audience text not null default 'both' check (audience in ('both','groom','bride')),
  sort_order integer not null default 35,
  is_published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
alter table public.site_sections enable row level security;
drop policy if exists "Public reads published sections" on public.site_sections;
create policy "Public reads published sections" on public.site_sections for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "Admins manage sections" on public.site_sections;
create policy "Admins manage sections" on public.site_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Audit entries from any member, only as themselves.
drop policy if exists "Admins append own audit logs" on public.audit_logs;
drop policy if exists "Members append own audit logs" on public.audit_logs;
create policy "Members append own audit logs" on public.audit_logs for insert to authenticated
  with check (public.is_member() and actor_id = (select auth.uid()));
