# Deployment and one-time setup

Supabase project: `vpqlgywiqsgiqmczsjrn` (ap-south-1, Mumbai) · Site: `https://sagar-dhrupti-wedding.vercel.app`

## 1. Run the database migration (once)

Supabase dashboard → **SQL Editor** → paste and run
`supabase/migrations/20261112000000_refs_and_google_admins.sql`.

It adds:
- `ref_code` on RSVPs and guests, and a `refs` site setting with both WhatsApp numbers
- `submit_rsvp_v2` (stores the ref and links invite codes) and `get_invite` (name-only lookup for `?c=CODE`)
- `admin_allowlist` + `claim_admin()` for Google sign-in admins
- copies existing admins onto the allow-list

Then make yourself super admin (use the Google account you will sign in with):

```sql
insert into public.admin_allowlist(email, role) values ('your.name@gmail.com', 'super_admin')
on conflict (email) do update set role = 'super_admin';
```

Until the migration runs, the invitation still works: RSVPs fall back to the existing `submit-rsvp` Edge Function and WhatsApp routing works from `config.js`.

## 2. Turn on Google sign-in

1. **Google Cloud Console** → APIs & Services → Credentials → *Create credentials* → **OAuth client ID** → Web application.
   - Authorised JavaScript origins: `https://sagar-dhrupti-wedding.vercel.app`
   - Authorised redirect URI: `https://vpqlgywiqsgiqmczsjrn.supabase.co/auth/v1/callback`
   - Configure the OAuth consent screen (External, app name “Sagar & Dhrupti Wedding Admin”), publish it.
2. **Supabase** → Authentication → Sign In / Providers → **Google** → enable, paste the Client ID and Client Secret, save.
3. **Supabase** → Authentication → URL Configuration:
   - Site URL: `https://sagar-dhrupti-wedding.vercel.app`
   - Redirect URLs: add `https://sagar-dhrupti-wedding.vercel.app/admin` (and `http://localhost:8080/admin` for local testing; add a custom domain here too if you attach one).

## How admin access works

1. Admin page → **Continue with Google**. Supabase handles the OAuth flow (PKCE) and returns to `/admin`.
2. The page calls `claim_admin()`. If the verified Google email is on `admin_allowlist`, a profile is created with that role; otherwise the session is signed out with a clear message.
3. Super admins add or remove people under **Admins** by email. Removing an email removes that person's admin profile immediately.
4. All data access stays behind Row Level Security (`is_admin()` / `is_super_admin()`); the publishable key in the site cannot read guests or RSVPs.

## Admin features

- **Overview**: headcount, replies by side, share links, latest replies
- **RSVPs**: search, filter by side/answer, reply on WhatsApp, CSV export (Excel-friendly UTF-8)
- **Guests & invites**: personal `?ref=…&c=CODE` links, “Send invite on WhatsApp” to the guest's number
- **Share links**: `?ref=sags` / `?ref=drups` links and a personal-link generator (`&to=Name`)
- **Events**, **Gallery** (direct photo upload to the `wedding-gallery` bucket), **Settings** (WhatsApp numbers per ref, couple, venue), **Admins**

## Security notes

Never put the service-role or `sb_secret_` key in `site/`, Git or Vercel env vars exposed to the browser. The CI checker fails the build if one appears.
