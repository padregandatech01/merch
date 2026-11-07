-- Only an application that the admin returned for more information may be resubmitted.
grant update (status) on public.supplier_applications to authenticated;
drop policy "supplier can amend requested information" on public.supplier_applications;
create policy "supplier can amend requested information" on public.supplier_applications
for update to authenticated
using ((select auth.uid())=user_id and status='needs_info')
with check ((select auth.uid())=user_id and status='pending' and affirmed);