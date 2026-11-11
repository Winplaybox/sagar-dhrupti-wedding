# Deployment and one-time setup

Supabase project: `vpqlgywiqsgiqmczsjrn` (ap-south-1, Mumbai) · Site: `https://sagar-dhrupti-wedding.vercel.app`

## 1. Database (once, in order)

Supabase dashboard → **SQL Editor** → run each file, top to bottom:

1. `supabase/migrations/20261112000000_refs_and_google_admins.sql`
2. `supabase/migrations/20261113000000_family_referrers_roles_sections.sql`
3. `supabase/migrations/20261114000000_side_onboarding.sql`

All are safe to run again. Together they add:
- `members`: who can sign in (super_admin / admin / user), their side, relation and WhatsApp
- `referrers`: one invite link per family member (`?ref=code`), owner, side, WhatsApp; `sags` and `drups` are created
- `rsvps.referrer_id` / `guests.referrer_id`: who invited each guest
- `events.audience` (both / groom / bride) and the groom-side Vastu (25 Dec 2026) and Haldi (1 Feb 2027) events
- `site_sections`: custom sections on the invitation
- first sign-in onboarding: people without a side choose groom / bride, relation and WhatsApp; their link is created as `groom-mother`, `bride-brother-2`, …
- `claim_access()`, `get_referrer()`, `submit_rsvp_v2()`, `update_my_member()` and Row Level Security for every role

Then add the first people (emails are kept out of Git on purpose):

```sql
insert into public.members(email, role, display_name, side) values
  ('SUPER_ADMIN_EMAIL', 'super_admin', 'Super admin', null),
  ('GROOM_EMAIL', 'admin', 'Sagar', 'groom')
on conflict (email) do update set role = excluded.role, display_name = excluded.display_name, side = excluded.side;
update public.referrers set owner_email = 'GROOM_EMAIL' where code = 'sags';
```

Everyone else is added from the dashboard: **People & access**.

## 2. Google sign-in

Reuse the existing Google Cloud project (the one used for the YouTube automation) or create a new one.

1. **Google Cloud Console** → APIs & Services → **OAuth consent screen**: External, app name “Sagar & Dhrupti Wedding”, your email, then **Publish app**.
2. **Credentials** → *Create credentials* → **OAuth client ID** → **Web application** (desktop clients from Colab will not work):
   - Authorised JavaScript origins: `https://sagar-dhrupti-wedding.vercel.app`
   - Authorised redirect URI: `https://vpqlgywiqsgiqmczsjrn.supabase.co/auth/v1/callback`
3. **Supabase** → Authentication → **Sign In / Providers** → **Google** → enable, paste Client ID + Client Secret, save.
4. **Supabase** → Authentication → **URL Configuration**:
   - Site URL: `https://sagar-dhrupti-wedding.vercel.app`
   - Redirect URLs: `https://sagar-dhrupti-wedding.vercel.app/admin` (add preview or custom domains here too)

## How sign-in works

1. `/admin` → **Continue with Google** (Supabase OAuth with PKCE). The button first checks that the Google provider is on.
2. The page calls `claim_access()`. A verified Google email found in `members` gets a profile with that role; links created for that email (`owner_email`) are attached to the account. Anyone else is signed straight out with a message.
3. Removing a person in **People & access** removes their access immediately; their links keep working.
4. Permissions are enforced in Postgres (RLS), not just hidden in the UI: family members can only read their own links, the RSVPs from those links and their guests.

## Editing the invitation

- **Events**: one row per function with *Who sees it* (both / groom / bride), date, optional time and venue.
- **Sections & text**: reorder or hide built-in sections (couple 10, countdown 20, events 30, venue 40, gallery 50, RSVP 60), add custom sections (text, photo, blessing, names list), override any heading in the four languages.
- **Couple & venue**, **Gallery** (direct upload to the `wedding-gallery` bucket).

## Security notes

Never put the service-role or `sb_secret_` key in `site/`, Git or browser-exposed env vars. The build checker fails if one appears.
