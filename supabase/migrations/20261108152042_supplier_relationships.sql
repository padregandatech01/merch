-- Supplier relations: one durable relationship per contact identity; conversations survive onboarding.
-- The existing department portal-account auth identity is reused after acceptance.
create table public.supplier_relationships (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.portal_accounts(user_id) on delete cascade,
 supplier_type text not null check (supplier_type in ('wholesaler','manufacturer')),
 invited_email text not null check (char_length(invited_email) between 3 and 254),
 invited_by uuid references auth.users(id) on delete set null,
 status text not null default 'invited' check (status in ('invited','discussing','accepted','completed','declined','revoked')),
 requested_email text check (requested_email is null or char_length(requested_email) between 3 and 254),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 accepted_at timestamptz,
 completed_at timestamptz,
 declined_at timestamptz,
 revoked_at timestamptz,
 last_message_at timestamptz,
 last_sender_kind text check (last_sender_kind is null or last_sender_kind in ('admin','supplier')),
 admin_read_at timestamptz,
 supplier_read_at timestamptz
);
comment on table public.supplier_relationships is 'Prospective-to-permanent supplier relationship. Account identity remains stable; stage is not commercial authorization.';
create index supplier_relations_stage_idx on public.supplier_relationships(status,coalesce(last_message_at,created_at) desc);
create table public.supplier_messages (
 id uuid primary key default gen_random_uuid(),
 relationship_id uuid not null references public.supplier_relationships(id) on delete cascade,
 sender_user_id uuid not null references auth.users(id) on delete restrict,
 sender_kind text not null check (sender_kind in ('admin','supplier')),
 body text not null check (char_length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
comment on table public.supplier_messages is 'Append-only supplier-private conversation with immutable author, timestamps and relationship.';
create index supplier_messages_thread_idx on public.supplier_messages(relationship_id,created_at desc,id desc);
alter table public.supplier_relationships enable row level security;
alter table public.supplier_messages enable row level security;
revoke all on public.supplier_relationships,public.supplier_messages from public,anon,authenticated;
grant select on public.supplier_relationships,public.supplier_messages to authenticated;
grant all on public.supplier_relationships,public.supplier_messages to service_role;
create policy "own active supplier relation or department admin"
 on public.supplier_relationships for select to authenticated
 using (
   (user_id=(select auth.uid()) and exists(select 1 from public.portal_accounts p
     where p.user_id=(select auth.uid()) and p.status='active'))
   or exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='dept_admin')
 );
create policy "relationship participant can read messages"
 on public.supplier_messages for select to authenticated
 using (exists(select 1 from public.supplier_relationships r where r.id=relationship_id
     and ((r.user_id=(select auth.uid()) and exists(select 1 from public.portal_accounts a
        where a.user_id=(select auth.uid()) and a.status='active'))
       or exists(select 1 from public.staff_roles s where s.user_id=(select auth.uid()) and s.role='dept_admin'))));
-- Only trusted server actions with an admin secret may change lifecycle/read markers or append messages.
create function loxada_internal.supplier_message_added()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 update public.supplier_relationships
 set last_message_at=new.created_at,last_sender_kind=new.sender_kind,updated_at=now(),
 admin_read_at=case when new.sender_kind='admin' then now() else admin_read_at end,
 supplier_read_at=case when new.sender_kind='supplier' then now() else supplier_read_at end
 where id=new.relationship_id;
 return new;
end $$;
revoke all on function loxada_internal.supplier_message_added() from public,anon,authenticated;
create trigger supplier_message_added after insert on public.supplier_messages
for each row execute function loxada_internal.supplier_message_added();
-- Provisional invited accounts must not bypass the portal via direct PostgREST supplier-app inserts.
drop policy "supplier can apply once" on public.supplier_applications;
create policy "supplier can apply once" on public.supplier_applications for insert to authenticated
with check (
 user_id=(select auth.uid()) and status='pending' and affirmed
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid())
    and a.status='active' and a.account_type in ('wholesaler','manufacturer'))
 and not exists(select 1 from public.supplier_relationships r where r.user_id=(select auth.uid())
    and r.status <> 'completed')
);
drop policy "supplier can amend requested information" on public.supplier_applications;
create policy "supplier can amend requested information" on public.supplier_applications for update to authenticated
using (user_id=(select auth.uid()) and status='needs_info'
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid()) and a.status='active')
 and not exists(select 1 from public.supplier_relationships r where r.user_id=(select auth.uid()) and r.status <> 'completed'))
with check (user_id=(select auth.uid()) and status='pending' and affirmed
 and exists(select 1 from public.portal_accounts a where a.user_id=(select auth.uid()) and a.status='active')
 and not exists(select 1 from public.supplier_relationships r where r.user_id=(select auth.uid()) and r.status <> 'completed'))
;
