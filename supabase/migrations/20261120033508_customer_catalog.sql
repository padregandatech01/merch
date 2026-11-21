-- Customer projections receive only approved department evidence through a trusted source.
create schema customer_catalog;
revoke all on schema customer_catalog from public, anon, authenticated;
grant usage on schema customer_catalog to service_role;

create table customer_catalog.listings (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (length(btrim(source_key)) between 1 and 160),
  title text not null check (length(btrim(title)) between 1 and 180),
  sku text not null unique check (length(btrim(sku)) between 1 and 160),
  category text not null check (category in ('Art prints','Apparel')),
  price_centavos integer not null check (price_centavos > 0),
  accepted_stock_ref text not null check (btrim(accepted_stock_ref) <> ''),
  product_authority_ref text not null check (btrim(product_authority_ref) <> ''),
  on_hand integer not null check (on_hand >= 0),
  quarantined integer not null check (quarantined between 0 and on_hand),
  held_unpaid integer not null check (held_unpaid >= 0),
  allocated_paid integer not null check (allocated_paid >= 0),
  available_units integer generated always as
    (greatest(0::bigint, on_hand::bigint - quarantined - held_unpaid - allocated_paid)) stored,
  publication_ref text not null check (btrim(publication_ref) <> ''),
  visible_from timestamptz not null,
  visible_until timestamptz,
  withdrawn_at timestamptz,
  check (visible_until is null or visible_until > visible_from)
);
alter table customer_catalog.listings enable row level security;

revoke all on all tables in schema customer_catalog from public, anon, authenticated, service_role;
grant select on all tables in schema customer_catalog to service_role;

create function public.department_customer_catalog(p_actor uuid, p_query text, p_page integer) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'label', category, 'price', price_centavos, 'available', available_units) order by title, id)
    from (
      select * from customer_catalog.listings
      where visible_from <= statement_timestamp()
        and (visible_until is null or visible_until > statement_timestamp())
        and (withdrawn_at is null or withdrawn_at > statement_timestamp())
        and available_units > 0
        and (coalesce(btrim(p_query),'') = '' or strpos(lower(title),lower(btrim(p_query))) > 0)
      order by title,id limit 25 offset ((p_page - 1) * 24)
    ) page
  ), '[]'::jsonb), 'access', 'null'::jsonb)
  where p_page between 1 and 100000 and length(coalesce(p_query,'')) <= 100
    and exists (select 1 from public.portal_accounts a where a.user_id = p_actor
      and a.account_type = 'buyer' and a.status = 'active')
    and not exists (select 1 from public.staff_roles s where s.user_id = p_actor)
$$;
revoke all on function public.department_customer_catalog(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.department_customer_catalog(uuid,text,integer) to service_role;
