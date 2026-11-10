# Deployment and operations

Supabase project: vpqlgywiqsgiqmczsjrn  
Region: ap-south-1 (Mumbai)  
API URL: https://vpqlgywiqsgiqmczsjrn.supabase.co

## Environment
Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY locally and in Vercel. Never expose a service-role key in a NEXT_PUBLIC variable or commit it.

## First administrator
1. Create the first user in Supabase Authentication.
2. Assign the first trusted account as super admin in SQL Editor:
   insert into public.profiles (id, display_name, role) values ('AUTH_USER_UUID', 'Wedding Super Admin', 'super_admin');
3. Grant additional admin access only to trusted users.

## WhatsApp
RSVP is persisted to Postgres first. If a guest opts in and supplies a phone number, the browser opens a prefilled WhatsApp message addressed to the guest's own number. This is not an inbound webhook or automated business messaging integration. Automated inbound replies require WhatsApp Business Platform credentials, a verified business number and a webhook endpoint.

## Deploy
Import this private repository into Vercel, configure the environment variables, then deploy. Add the production domain and configure metadata/SEO.

## Current dashboard scope
Secure sign-in and RSVP viewing are implemented. Full content CRUD, role-management UI, CSV export, audit-event recording and translation editing remain subsequent implementation work.