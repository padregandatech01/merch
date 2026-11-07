
-- Registration and supplier applications are separate from existing staff_roles.
create table public.portal_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 account_type text not null check (account_type in ('buyer', 'wholesaler', 'manufacturer')),
 display_name text not null check (char_length(display_name) between 2 and 80),
 created_at timestamptz not null default now()
);
create table public.supplier_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.portal_accounts(user_id) on delete cascade,
 legal_name text not null check (char_length(legal_name) between 2 and 160),
 organization_name text check (organization_name is null or char_length(organization_name) between 2 and 160),
 contact_email text not null check (char_length(contact_email) between 3 and 254),
 capability_statement text not null check (char_length(capability_statement) between 20 and 3000),
 affirmed boolean not null default false check (affirmed),
 status text not null default 'pending' check (status in ('pending','needs_info','verified','rejected','suspended')),
 reviewer_feedback text,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index supplier_applications_status_idx on public.supplier_applications(status,created_at desc);
alter table public.portal_accounts enable row level security;
alter table public.supplier_applications enable row level security;
revoke all on public.portal_accounts,public.supplier_applications from anon,authenticated;
grant select on public.portal_accounts to authenticated;
grant select,insert on public.supplier_applications to authenticated;
grant update(legal_name,organization_name,contact_email,capability_statement,affirmed,updated_at) on public.supplier_applications to authenticated;
grant all on public.portal_accounts,public.supplier_applications to service_role;
create policy "own or department admin profile" on public.portal_accounts for select to authenticated
using ((select auth.uid())=user_id or exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='dept_admin'));
create policy "own or department admin application" on public.supplier_applications for select to authenticated
using ((select auth.uid())=user_id or exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='dept_admin'));
create policy "supplier can apply once" on public.supplier_applications for insert to authenticated
with check (
 (select auth.uid())=user_id and status='pending' and affirmed
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid()) and a.account_type in ('wholesaler','manufacturer'))
);
create policy "supplier can amend requested information" on public.supplier_applications for update to authenticated
using ((select auth.uid())=user_id and status='needs_info')
with check ((select auth.uid())=user_id and status='needs_info' and affirmed);
create function public.create_department_portal_account()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
 account_kind text := 'buyer';
 member_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'),''),split_part(coalesce(new.email,'member'),'@',1));
begin
 if char_length(member_name)<2 or char_length(member_name)>80 then member_name:='Member'; end if;
 insert into public.portal_accounts(user_id,account_type,display_name)
 values(new.id,account_kind,member_name)
 on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function public.create_department_portal_account() from public,anon,authenticated;
create trigger after_auth_user_created_department_portal after insert on auth.users
for each row execute function public.create_department_portal_account();
-- Older customer identities remain department-local; staff privilege remains in staff_roles.
insert into public.portal_accounts(user_id,account_type,display_name)
select u.id, 'buyer',
 case when char_length(split_part(coalesce(u.email,'member'),'@',1)) between 2 and 80
 then split_part(u.email,'@',1) else 'Member' end
from auth.users u left join public.staff_roles s on s.user_id=u.id
where s.user_id is null
on conflict (user_id) do nothing;
comment on table public.portal_accounts is 'Department-local unprivileged reader/subscriber/buyer or supplier applicant identities; staff RBAC is separate.';
comment on table public.supplier_applications is 'Supplier qualification application; verified status does not grant rights, purchase, publication or licensing authority.';
