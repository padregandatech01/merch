-- The admin dashboard receives aggregate cells, never account identifiers.
create function public.department_account_cube()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
 select coalesce(jsonb_agg(to_jsonb(cell) order by cell.month, cell.account_type, cell.status), '[]'::jsonb)
 from (
   select
     to_char(a.created_at at time zone 'Asia/Manila', 'YYYY-MM') as month,
     a.account_type,
     a.status,
     count(*) as total
   from public.portal_accounts a
   where not exists (select 1 from public.staff_roles s where s.user_id = a.user_id)
   group by 1, 2, 3
 ) cell;
$$;
revoke all on function public.department_account_cube() from public, anon, authenticated;
grant execute on function public.department_account_cube() to service_role;
comment on function public.department_account_cube() is 'Read-only monthly account snapshot by current role and suspension status, excluding staff. Service role only.';
