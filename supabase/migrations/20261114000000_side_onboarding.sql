-- First sign-in asks each person which side they belong to and creates their invite link
-- with a readable code such as groom-mother, bride-brother-2.
-- Run AFTER 20261113000000_family_referrers_roles_sections.sql. Safe to run more than once.

-- Readable, unique link code: <side>-<relation>[-n]
create or replace function public.next_referrer_code(p_side text, p_relation text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_base text := lower(p_side) || '-' || coalesce(nullif(regexp_replace(lower(coalesce(p_relation, '')), '[^a-z0-9]+', '-', 'g'), ''), 'family');
  v_code text := v_base;
  n integer := 1;
begin
  v_base := left(trim(both '-' from v_base), 28);
  v_code := v_base;
  while exists(select 1 from public.referrers r where r.code = v_code) or v_code in ('groom', 'bride') loop
    n := n + 1;
    v_code := v_base || '-' || n;
  end loop;
  return v_code;
end; $$;
revoke all on function public.next_referrer_code(text, text) from public, anon;
grant execute on function public.next_referrer_code(text, text) to authenticated;

-- Called from the dashboard the first time someone signs in without a side.
-- Only works while the side is still empty; after that only admins can change it.
create or replace function public.complete_my_onboarding(p_side text, p_relation text, p_display_name text, p_whatsapp text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_m public.members;
  v_wa text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_name text := nullif(trim(p_display_name), '');
  v_code text;
begin
  if v_uid is null then raise exception 'Sign in first'; end if;
  if p_side not in ('groom', 'bride') then raise exception 'Choose the groom''s side or the bride''s side'; end if;
  if v_wa is not null and length(v_wa) = 10 then v_wa := '91' || v_wa; end if;
  if v_wa is null or v_wa !~ '^[0-9]{11,15}$' then raise exception 'Add your WhatsApp number with country code'; end if;
  select * into v_m from public.members m where m.user_id = v_uid;
  if not found then raise exception 'Your account has not been added yet'; end if;
  if v_m.side is not null and v_m.side <> p_side then raise exception 'Your side is already set. Ask an admin to change it.'; end if;

  update public.members set side = p_side, relation = coalesce(nullif(p_relation, ''), relation),
         display_name = coalesce(v_name, display_name), whatsapp = v_wa where user_id = v_uid;
  update public.profiles set display_name = coalesce(v_name, display_name), updated_at = now() where id = v_uid;

  select r.code into v_code from public.referrers r where r.owner_user_id = v_uid order by r.created_at limit 1;
  if v_code is null then
    v_code := public.next_referrer_code(p_side, coalesce(nullif(p_relation, ''), v_m.relation));
    insert into public.referrers(code, display_name, relation, side, whatsapp, owner_user_id, owner_email, created_by)
    values (v_code, coalesce(v_name, v_m.display_name, split_part(v_m.email, '@', 1)), coalesce(nullif(p_relation, ''), v_m.relation),
            p_side, v_wa, v_uid, v_m.email, v_uid);
  end if;
  return v_code;
end; $$;
revoke all on function public.complete_my_onboarding(text, text, text, text) from public, anon;
grant execute on function public.complete_my_onboarding(text, text, text, text) to authenticated;

-- ?ref=groom and ?ref=bride work as aliases of the couple's own links.
create or replace function public.get_referrer(p_code text)
returns table(code text, display_name text, relation text, side text, whatsapp text)
language sql stable security definer set search_path = '' as $$
  select r.code, r.display_name, r.relation, r.side, r.whatsapp from public.referrers r
  where r.code = case lower(trim(p_code)) when 'groom' then 'sags' when 'bride' then 'drups' else lower(trim(p_code)) end
    and r.is_active limit 1;
$$;
