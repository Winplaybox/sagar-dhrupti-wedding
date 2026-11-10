# Deployment and operations

Supabase project: `vpqlgywiqsgiqmczsjrn`  
Region: `ap-south-1` (Mumbai)  
API URL: `https://vpqlgywiqsgiqmczsjrn.supabase.co`

## Production hosting

The Vercel project is linked to `Winplaybox/sagar-dhrupti-wedding`. The repository-root `vercel.json` extracts `wedding-site-source.zip` into `dist/`; Vercel serves `dist/` as static output. The archive contains `index.html` and `admin.html`. The `/admin` rewrite routes to the admin console. The public URL is `https://sagar-dhrupti-wedding.vercel.app`.

The Next.js app at the repository root is retained as a development/build baseline and is checked by GitHub Actions. It is not the production entry point while the custom static build is configured.

## Supabase credentials

The static site uses the project's Supabase URL and publishable (`sb_publishable_...`) key. Publishable keys are intended for browser use and are restricted by database Row Level Security. Never put the service-role key into the site, a `NEXT_PUBLIC_*` variable, Git, or a browser bundle.

## First administrator

1. Create the first trusted user in Supabase **Authentication → Users**.
2. Assign the first trusted account as super admin in SQL Editor, replacing the email:

```sql
insert into public.profiles (id, display_name, role)
select id, 'Super Admin', 'super_admin'
from auth.users
where email = 'YOUR_EMAIL';
```

3. Open `/admin` and sign in. Create additional Auth users first, then add their UUIDs from the Admins tab. Only a super admin can manage profiles and roles.

## RSVP and WhatsApp

Public RSVP submissions go through the existing `submit-rsvp` Supabase Edge Function, which validates the request and stores it in Postgres. The public form includes email and dietary notes. WhatsApp consent is a separate, explicit checkbox; a phone number by itself is not consent. If the public `contact` site setting contains `{"whatsapp_number":"919XXXXXXXXX"}`, a guest who opted in can open a prefilled WhatsApp link. This is guest-initiated, not automated WhatsApp Business messaging.

## Admin audit records

The admin console writes audit entries to `public.audit_logs`. The migration `supabase/migrations/20261110002000_admin_audit_log_insert_policy.sql` permits authenticated administrators to append entries only with their own `actor_id`. Existing read access remains admin-only.

## CI

GitHub Actions runs TypeScript checking and a Next.js build for the retained root app, then parses the inline scripts in the static production pages and checks key RSVP fields and routing. Vercel deploys the static archive from the repository root.
