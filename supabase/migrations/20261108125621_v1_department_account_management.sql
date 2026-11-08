
-- Department-local account management. Existing staff_roles and application decisions are not modified.
alter table public.portal_accounts
 add column status text not null default 'active'
   check (status in ('active','suspended')),
 add column suspension_reason text,
 add column updated_at timestamptz not null default now(),
 add column updated_by uuid references public.staff_roles(user_id) on delete set null,
 add constraint portal_accounts_suspension_consistency check (
   (status='active' and suspension_reason is null)
   or (status='suspended' and char_length(suspension_reason) between 8 and 500)
 );
create index portal_accounts_admin_filter_idx on public.portal_accounts(status,account_type,created_at desc);
create table public.portal_account_audit (
 id bigint generated always as identity primary key,
 subject_user_id uuid not null references auth.users(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check (action in ('account_suspended','account_reactivated','display_name_changed','recovery_email_sent')),
 previous_value text,
 new_value text,
 note text,
 created_at timestamptz not null default now()
);
alter table public.portal_account_audit enable row level security;
revoke all on public.portal_account_audit from anon,authenticated;
grant select on public.portal_account_audit to authenticated;
grant all on public.portal_account_audit to service_role;
create policy "department admin can view account history" on public.portal_account_audit
 for select to authenticated
 using (exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='dept_admin'));
create schema if not exists loxada_internal;
revoke all on schema loxada_internal from public,anon,authenticated;
create function loxada_internal.log_portal_account_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if old.status is distinct from new.status then
  insert into public.portal_account_audit(subject_user_id,actor_user_id,action,previous_value,new_value,note)
  values(new.user_id,new.updated_by,
    case when new.status='suspended' then 'account_suspended' else 'account_reactivated' end,
    old.status,new.status,new.suspension_reason);
 end if;
 if old.display_name is distinct from new.display_name then
  insert into public.portal_account_audit(subject_user_id,actor_user_id,action,previous_value,new_value)
  values(new.user_id,new.updated_by,'display_name_changed',old.display_name,new.display_name);
 end if;
 return new;
end;
$$;
revoke all on function loxada_internal.log_portal_account_update() from public,anon,authenticated;
create trigger audit_portal_account_update after update on public.portal_accounts
for each row execute function loxada_internal.log_portal_account_update();

-- A suspended supplier must not use the data API to bypass the server-side portal check.
drop policy "own or department admin application" on public.supplier_applications;
create policy "own or department admin application" on public.supplier_applications
for select to authenticated
using (
 ( (select auth.uid())=user_id
   and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid()) and a.status='active') )
 or exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='dept_admin')
);
drop policy "supplier can apply once" on public.supplier_applications;
create policy "supplier can apply once" on public.supplier_applications
for insert to authenticated with check (
 (select auth.uid())=user_id and status='pending' and affirmed
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid())
  and a.status='active' and a.account_type in ('wholesaler','manufacturer'))
);
drop policy "supplier can amend requested information" on public.supplier_applications;
create policy "supplier can amend requested information" on public.supplier_applications
for update to authenticated
using (
 (select auth.uid())=user_id and status='needs_info'
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid()) and a.status='active')
)
with check (
 (select auth.uid())=user_id and status='pending' and affirmed
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid()) and a.status='active')
);
comment on table public.portal_account_audit is 'Append-only department admin account changes, recorded automatically by trigger; not supplier approval history.';
