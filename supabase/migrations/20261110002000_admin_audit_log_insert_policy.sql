-- Allow authenticated administrators to append audit records only as themselves.
create policy "Admins append own audit logs"
on public.audit_logs
for insert
to authenticated
with check (public.is_admin() and actor_id = (select auth.uid()));
