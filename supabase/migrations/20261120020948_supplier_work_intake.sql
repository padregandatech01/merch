-- Versioned private supplier intake. The browser has no access to this schema or its write endpoints.
create schema supply_work;
revoke all on schema supply_work from public, anon, authenticated;
grant usage on schema supply_work to service_role;

create table supply_work.qualifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.supplier_applications(id),
  owner_id uuid not null references public.portal_accounts(user_id),
  supplier_role text not null check (supplier_role in ('wholesaler', 'manufacturer')),
  application_revision timestamptz not null,
  reviewer_id uuid not null,
  evidence_ref text not null check (char_length(btrim(evidence_ref)) between 3 and 240),
  assessment text not null check (char_length(btrim(assessment)) between 10 and 1500),
  verified_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid,
  check (reviewer_id <> owner_id),
  check ((revoked_at is null) = (revoked_by is null))
);
create unique index on supply_work.qualifications (application_id, application_revision, supplier_role) where revoked_at is null;

-- Only the trusted workflow owner records a verified tender handoff. A supplier cannot supply
-- the invitation, approved brief, Owner mandate or rights evidence for its own proposal.
create table supply_work.invitations (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references supply_work.qualifications(id),
  brief_id text not null check (char_length(btrim(brief_id)) between 1 and 160),
  brief_revision integer not null check (brief_revision > 0),
  brief_title text not null check (char_length(btrim(brief_title)) between 2 and 160),
  scope_summary text not null check (char_length(btrim(scope_summary)) between 5 and 3000),
  brief_approval_ref text not null check (btrim(brief_approval_ref) <> ''),
  authority_ref text not null check (btrim(authority_ref) <> ''),
  rights_ref text,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (starts_at < expires_at),
  unique (qualification_id, brief_id, brief_revision)
);

create table supply_work.items (
  id uuid primary key,
  owner_id uuid not null references public.portal_accounts(user_id),
  application_id uuid not null references public.supplier_applications(id),
  supplier_role text not null check (supplier_role in ('wholesaler', 'manufacturer')),
  invitation_id uuid unique references supply_work.invitations(id),
  external_key text,
  head integer not null default 0 check (head >= 0),
  updated_at timestamptz not null default statement_timestamp(),
  unique (owner_id, supplier_role, external_key)
);
create index on supply_work.items (owner_id, supplier_role, updated_at desc, id);

create table supply_work.revisions (
  item_id uuid not null references supply_work.items(id),
  revision integer not null check (revision > 0),
  state text not null check (state in ('draft', 'submitted')),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  application_revision timestamptz not null,
  qualification_id uuid references supply_work.qualifications(id),
  recorded_at timestamptz not null default statement_timestamp(),
  primary key (item_id, revision)
);
create index on supply_work.revisions (recorded_at desc, item_id, revision desc) where state = 'submitted';

create table supply_work.feedback (
  item_id uuid not null,
  revision integer not null,
  reviewer_id uuid not null,
  message text not null check (char_length(btrim(message)) between 5 and 1500),
  recorded_at timestamptz not null default statement_timestamp(),
  primary key (item_id, revision),
  foreign key (item_id, revision) references supply_work.revisions(item_id, revision)
);

alter table supply_work.feedback enable row level security;
alter table supply_work.qualifications enable row level security;
alter table supply_work.invitations enable row level security;
alter table supply_work.items enable row level security;
alter table supply_work.revisions enable row level security;
revoke all on all tables in schema supply_work from public, anon, authenticated, service_role;
grant select on all tables in schema supply_work to service_role;
grant insert on supply_work.qualifications, supply_work.items, supply_work.revisions, supply_work.feedback to service_role;
grant update (revoked_at, revoked_by) on supply_work.qualifications to service_role;
grant update (revoked_at) on supply_work.invitations to service_role;
grant update (external_key, head, updated_at) on supply_work.items to service_role;

create function supply_work.active_role(p_actor uuid) returns text
language sql stable security invoker set search_path = ''
as $$
  select a.account_type
  from public.portal_accounts a
  where a.user_id = p_actor and a.status = 'active' and a.account_type in ('wholesaler', 'manufacturer')
    and not exists (select 1 from public.staff_roles s where s.user_id = a.user_id)
    and ( exists (
      select 1 from public.supplier_relationships r where r.user_id = a.user_id
        and r.supplier_type = a.account_type and r.status = 'completed'
    ))
$$;

create function supply_work.field_contract(p_role text) returns jsonb
language sql immutable security invoker set search_path = ''
as $$
  select '{"wholesaler":[{"key":"external_id","label":"Supplier product or variant ID","type":"text","required":true,"maxLength":160},{"key":"category","label":"Product category","type":"choice","required":true,"choices":{"ART_PRINT":"Poster or art print","APPAREL":"Apparel"}},{"key":"variant","label":"Variant, size or material","type":"text","required":true,"maxLength":160},{"key":"provenance","label":"Source and authenticity evidence references","type":"long","required":true,"maxLength":2000},{"key":"quantity","label":"Offered quantity","type":"integer","required":true},{"key":"moq","label":"Minimum order quantity","type":"integer","required":true},{"key":"price_centavos","label":"Unit price (PHP)","type":"money","required":true},{"key":"valid_until","label":"Quote end day, exclusive (Manila)","type":"date","required":true},{"key":"delivery_terms","label":"Lead time, destination, ownership, risk and shipping terms","type":"long","required":true,"maxLength":2000}],"manufacturer":[{"key":"quantity","label":"Proposed batch quantity","type":"integer","required":true},{"key":"price_centavos","label":"Full itemized bid total (PHP)","type":"money","required":true},{"key":"costs","label":"Itemized materials, tooling, royalties and other costs","type":"long","required":true,"maxLength":2000},{"key":"schedule","label":"Sample and batch delivery schedule","type":"long","required":true,"maxLength":2000},{"key":"sample","label":"Sample and quality acceptance plan","type":"long","required":true,"maxLength":2000},{"key":"compliance","label":"Product safety, packaging and inspection plan","type":"long","required":true,"maxLength":2000},{"key":"contributions","label":"Subcontract and artwork contributions and exclusions","type":"long","required":true,"maxLength":2000}]}'::jsonb -> p_role
$$;

create function supply_work.check_fields(p_role text, p_fields jsonb, p_submit boolean) returns boolean
language plpgsql immutable security invoker set search_path = ''
as $$
declare
  definitions jsonb := supply_work.field_contract(p_role);
  definition jsonb;
  field_key text;
  field_json jsonb;
  field_text text;
begin
  if definitions is null or jsonb_typeof(p_fields) is distinct from 'object' or octet_length(p_fields::text) > 30000 then
    return false;
  end if;
  if exists (select 1 from jsonb_object_keys(p_fields) k(key)
    where not exists (select 1 from jsonb_array_elements(definitions) d where d->>'key' = k.key)) then
    return false;
  end if;
  for definition in select value from jsonb_array_elements(definitions) loop
    field_key := definition->>'key';
    field_json := p_fields->field_key;
    field_text := p_fields->>field_key;
    if field_json is null then
      if p_submit and (definition->>'required')::boolean then return false; end if;
      continue;
    end if;
    case definition->>'type'
      when 'choice' then
        if jsonb_typeof(field_json) <> 'string' or not ((definition->'choices') ? field_text) then return false; end if;
      when 'integer' then
        if jsonb_typeof(field_json) <> 'number' or field_text !~ '^[1-9][0-9]{0,8}$' then return false; end if;
      when 'money' then
        if jsonb_typeof(field_json) <> 'number' or field_text !~ '^(0|[1-9][0-9]{0,11})$' then return false; end if;
      when 'date' then
        if jsonb_typeof(field_json) <> 'string' or field_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          or not pg_input_is_valid(field_text, 'date') then return false; end if;
      else
        if jsonb_typeof(field_json) <> 'string' or btrim(field_text) = ''
          or char_length(field_text) > (definition->>'maxLength')::integer then return false; end if;
    end case;
  end loop;
  if p_role = 'licensor' and p_fields->>'valid_from' >= p_fields->>'valid_until' then return false; end if;
  if p_role = 'wholesaler' and (p_fields->>'moq')::integer > (p_fields->>'quantity')::integer then return false; end if;
  return true;
end
$$;

create function public.supplier_work_save(
  p_actor uuid, p_item uuid, p_expected integer, p_intent text, p_title text, p_fields jsonb, p_invitation uuid
) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  role_name text;
  application public.supplier_applications;
  item supply_work.items;
  past supply_work.revisions;
  qualification uuid;
  identity_key text;
  target_state text;
begin
  if p_actor is null or p_item is null or p_expected is null or p_expected not between 0 and 2147483646
    or p_intent is null or p_intent not in ('draft', 'submit')
    or p_title is null or char_length(btrim(p_title)) not between 2 and 160 then return 'invalid'; end if;
  -- Lock and recheck current account and application while changing the owned item.
  perform 1 from public.portal_accounts where user_id = p_actor for share;
  perform 1 from public.supplier_relationships where user_id = p_actor for share;
  role_name := supply_work.active_role(p_actor);
  if role_name is null then return 'denied'; end if;
  select * into application from public.supplier_applications where user_id = p_actor for share;
  if not found or application.status in ('rejected', 'suspended') then return 'application'; end if;
  if not supply_work.check_fields(role_name, p_fields, p_intent = 'submit') then return 'invalid'; end if;
  target_state := case p_intent when 'submit' then 'submitted' else 'draft' end;

  select * into item from supply_work.items where id = p_item for update;
  if found then
    if item.owner_id <> p_actor or item.supplier_role <> role_name or item.application_id <> application.id
      or item.invitation_id is distinct from p_invitation then return 'denied'; end if;
    select * into past from supply_work.revisions where item_id = p_item and revision = item.head;
    if item.head = p_expected + 1 and past.state = target_state and past.title = btrim(p_title) and past.fields = p_fields then
      return 'saved';
    end if;
    if item.head <> p_expected then return 'changed'; end if;
  elsif p_expected <> 0 then return 'changed';
  end if;

  if p_intent = 'submit' or role_name in ('prime_producer', 'manufacturer') then
    if role_name <> 'creator' then
      select q.id into qualification from supply_work.qualifications q
      where q.application_id = application.id and q.owner_id = p_actor and q.supplier_role = role_name
        and q.application_revision = application.updated_at and application.status = 'verified'
        and q.revoked_at is null for share;
      if qualification is null then return 'qualification'; end if;
    end if;
  end if;
  if role_name in ('prime_producer', 'manufacturer') then
    if not exists (
      select 1 from supply_work.invitations i where i.id = p_invitation and i.qualification_id = qualification
        and i.revoked_at is null and i.starts_at <= statement_timestamp() and i.expires_at > statement_timestamp()
        and (role_name <> 'manufacturer' or nullif(btrim(i.rights_ref), '') is not null)
      for share
    ) then return 'invitation'; end if;
  elsif p_invitation is not null then return 'invalid';
  end if;

  if p_intent = 'submit' then
    if role_name in ('publisher','licensor') then
      identity_key := jsonb_build_array(p_fields->>'namespace', p_fields->>'external_id',
        case when role_name = 'licensor' then p_fields->>'season' end)::text;
    elsif role_name = 'wholesaler' then
      identity_key := p_fields->>'external_id';
      if p_fields->>'valid_until' <= ((statement_timestamp() at time zone 'Asia/Manila')::date)::text then return 'invalid'; end if;
    end if;
    if item.external_key is not null and item.external_key is distinct from identity_key then return 'identity'; end if;
    if role_name = 'publisher' and exists (
      select 1 from supply_work.revisions r where r.item_id = p_item and r.state = 'submitted'
        and r.fields->>'batch_id' = p_fields->>'batch_id' and r.fields->>'source_row' = p_fields->>'source_row'
        and r.fields->>'source_revision' = p_fields->>'source_revision'
    ) then return 'duplicate'; end if;
  end if;

  if item.id is null then
    insert into supply_work.items(id, owner_id, application_id, supplier_role, invitation_id)
      values (p_item, p_actor, application.id, role_name, p_invitation);
  end if;
  insert into supply_work.revisions(item_id, revision, state, title, fields, application_revision, qualification_id)
    values (p_item, p_expected + 1, target_state, btrim(p_title), p_fields, application.updated_at, qualification);
  update supply_work.items set head = p_expected + 1, external_key = coalesce(external_key, identity_key),
    updated_at = statement_timestamp() where id = p_item;
  return 'saved';
exception when unique_violation then
  -- A retry that raced the initial insert has the same immutable receipt.
  if exists (select 1 from supply_work.items i join supply_work.revisions r on r.item_id = i.id
    where i.id = p_item and i.owner_id = p_actor and i.supplier_role = role_name
      and i.invitation_id is not distinct from p_invitation and r.revision = p_expected + 1
      and r.state = target_state and r.title = btrim(p_title) and r.fields = p_fields) then return 'saved'; end if;
  return 'duplicate';
end
$$;

create function public.supplier_work_read(p_actor uuid, p_item uuid, p_version integer, p_page integer) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  role_name text := supply_work.active_role(p_actor);
  application public.supplier_applications;
  qualification uuid;
begin
  if role_name is null or p_page is null or p_page not between 1 and 100000 then return null; end if;
  select * into application from public.supplier_applications where user_id = p_actor;
  select q.id into qualification from supply_work.qualifications q
  where q.application_id = application.id and q.owner_id = p_actor and q.supplier_role = role_name
    and q.application_revision = application.updated_at and application.status = 'verified' and q.revoked_at is null;
  return jsonb_build_object(
    'hasApplication', application.id is not null and application.status not in ('rejected','suspended'),
    'qualified', qualification is not null,
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'title', i.brief_title, 'revision', i.brief_revision,
        'scope', i.scope_summary, 'expiresAt', i.expires_at) order by i.expires_at, i.id)
      from supply_work.invitations i
      where role_name in ('prime_producer','manufacturer') and i.qualification_id = qualification
        and i.revoked_at is null and i.starts_at <= statement_timestamp() and i.expires_at > statement_timestamp()
        and (role_name <> 'manufacturer' or nullif(btrim(i.rights_ref), '') is not null)
        and not exists (select 1 from supply_work.items x where x.invitation_id = i.id)
    ), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from (
      select i.id, i.updated_at, r.title, r.state, r.revision
      from supply_work.items i join supply_work.revisions r on r.item_id = i.id and r.revision = i.head
      where i.owner_id = p_actor and i.supplier_role = role_name
      order by i.updated_at desc, i.id limit 26 offset (p_page - 1) * 25
    ) x), '[]'::jsonb),
    'selected', (select jsonb_build_object('id', i.id, 'head', i.head, 'invitation', i.invitation_id,
        'feedback', (select f.message from supply_work.feedback f where f.item_id = i.id and f.revision = r.revision),
        'writable', i.invitation_id is null or exists (
          select 1 from supply_work.invitations v where v.id = i.invitation_id and v.qualification_id = qualification
            and v.revoked_at is null and v.starts_at <= statement_timestamp() and v.expires_at > statement_timestamp()
            and (role_name <> 'manufacturer' or nullif(btrim(v.rights_ref), '') is not null)
        ), 'title', r.title, 'fields', r.fields, 'state', r.state, 'revision', r.revision,
        'versions', (select jsonb_agg(jsonb_build_object('revision', v.revision,'state',v.state,'date',v.recorded_at)
          order by v.revision desc) from supply_work.revisions v where v.item_id = i.id))
      from supply_work.items i join supply_work.revisions r on r.item_id = i.id and r.revision = coalesce(p_version, i.head)
      where i.id = p_item and i.owner_id = p_actor and i.supplier_role = role_name)
  );
end
$$;

create function public.supplier_work_review_list(p_staff uuid, p_item uuid, p_version integer, p_page integer) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not exists (select 1 from public.staff_roles where user_id = p_staff and role = 'dept_admin')
    or p_page is null or p_page not between 1 and 100000 then return null; end if;
  return jsonb_build_object(
    'submissions', coalesce((select jsonb_agg(to_jsonb(x) order by x.recorded_at desc, x.id, x.revision desc) from (
      select i.id, i.supplier_role, a.display_name, r.title, r.revision, r.recorded_at
      from supply_work.revisions r join supply_work.items i on i.id = r.item_id
      join public.portal_accounts a on a.user_id = i.owner_id
      where r.state = 'submitted'
      order by r.recorded_at desc, i.id, r.revision desc limit 26 offset (p_page - 1) * 25
    ) x), '[]'::jsonb),
    'selected', (select jsonb_build_object('id', i.id, 'supplier_role', i.supplier_role, 'title', r.title,
        'fields', r.fields, 'revision', r.revision, 'recordedAt', r.recorded_at,
        'applicationId', i.application_id, 'applicationRevision', r.application_revision,
        'qualification', r.qualification_id, 'invitation', i.invitation_id,
        'feedback', (select f.message from supply_work.feedback f where f.item_id = i.id and f.revision = r.revision),
        'current', not exists (select 1 from supply_work.revisions v where v.item_id = i.id and v.revision > r.revision and v.state = 'submitted'))
      from supply_work.items i join supply_work.revisions r on r.item_id = i.id
      where i.id = p_item and r.revision = p_version and r.state = 'submitted'),
    'supplierApplications', coalesce((select jsonb_agg(to_jsonb(x) order by x.display_name, x.id) from (
      select s.id, s.updated_at, a.display_name, a.account_type, q.id as qualification_id
      from public.supplier_applications s join public.portal_accounts a on a.user_id = s.user_id
      left join supply_work.qualifications q on q.application_id = s.id and q.application_revision = s.updated_at
        and q.supplier_role = a.account_type and q.revoked_at is null
      where s.status = 'verified' and s.reviewed_at is not null and a.account_type <> 'creator'
        and a.account_type = supply_work.active_role(a.user_id)
      order by a.display_name, s.id limit 26 offset (p_page - 1) * 25
    ) x), '[]'::jsonb)
  );
end
$$;

create function public.supplier_work_qualify(
  p_staff uuid, p_application uuid, p_expected timestamptz, p_evidence text, p_assessment text, p_revoke uuid
) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  application public.supplier_applications;
  role_name text;
begin
  if p_staff is null or not exists (select 1 from public.staff_roles
    where user_id = p_staff and role = 'dept_admin' for share) then return 'denied'; end if;
  select * into application from public.supplier_applications where id = p_application;
  if not found or application.user_id = p_staff then return 'denied'; end if;
  perform 1 from public.portal_accounts where user_id = application.user_id for share;
  perform 1 from public.supplier_relationships where user_id = application.user_id for share;
  select * into application from public.supplier_applications where id = p_application for update;
  if not found or application.updated_at is distinct from p_expected
    or application.status <> 'verified' or application.reviewed_at is null then return 'changed'; end if;
  role_name := supply_work.active_role(application.user_id);
  if role_name is null or role_name = 'creator' then return 'denied'; end if;
  if p_revoke is not null then
    update supply_work.qualifications set revoked_at = statement_timestamp(), revoked_by = p_staff
      where id = p_revoke and application_id = p_application and application_revision = p_expected
        and supplier_role = role_name and revoked_at is null;
    if not found then return 'changed'; end if;
  else
    if p_evidence is null or char_length(btrim(p_evidence)) not between 3 and 240
      or p_assessment is null or char_length(btrim(p_assessment)) not between 10 and 1500 then return 'invalid'; end if;
    insert into supply_work.qualifications(application_id, owner_id, supplier_role, application_revision,
      reviewer_id, evidence_ref, assessment)
    values (application.id, application.user_id, role_name, p_expected,
      p_staff, btrim(p_evidence), btrim(p_assessment))
    on conflict do nothing;
    if not found and not exists (
      select 1 from supply_work.qualifications q
      where q.application_id = p_application and q.application_revision = p_expected and q.supplier_role = role_name
        and q.revoked_at is null and q.reviewer_id = p_staff and q.evidence_ref = btrim(p_evidence)
        and q.assessment = btrim(p_assessment)
    ) then return 'changed'; end if;
  end if;
  return 'saved';
end
$$;

create function public.supplier_work_request_clarification(p_staff uuid, p_item uuid, p_version integer, p_message text)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  item supply_work.items;
begin
  if p_staff is null or not exists (select 1 from public.staff_roles
    where user_id = p_staff and role = 'dept_admin' for share) then return 'denied'; end if;
  if p_message is null or char_length(btrim(p_message)) not between 5 and 1500 then return 'invalid'; end if;
  select * into item from supply_work.items where id = p_item for share;
  if not found or item.owner_id = p_staff or not exists (
    select 1 from supply_work.revisions r where r.item_id = p_item and r.revision = p_version and r.state = 'submitted'
      and not exists (select 1 from supply_work.revisions newer where newer.item_id = r.item_id
        and newer.revision > r.revision and newer.state = 'submitted')
  ) then return 'changed'; end if;
  insert into supply_work.feedback(item_id, revision, reviewer_id, message)
    values (p_item, p_version, p_staff, btrim(p_message)) on conflict do nothing;
  if not found and not exists (select 1 from supply_work.feedback f where f.item_id = p_item and f.revision = p_version
    and f.reviewer_id = p_staff and f.message = btrim(p_message)) then return 'changed'; end if;
  return 'saved';
end
$$;

revoke all on all functions in schema supply_work from public, anon, authenticated;
grant execute on all functions in schema supply_work to service_role;
revoke all on function
  public.supplier_work_save(uuid,uuid,integer,text,text,jsonb,uuid),
  public.supplier_work_read(uuid,uuid,integer,integer),
  public.supplier_work_review_list(uuid,uuid,integer,integer),
  public.supplier_work_qualify(uuid,uuid,timestamptz,text,text,uuid),
  public.supplier_work_request_clarification(uuid,uuid,integer,text)
  from public, anon, authenticated;
grant execute on function
  public.supplier_work_save(uuid,uuid,integer,text,text,jsonb,uuid),
  public.supplier_work_read(uuid,uuid,integer,integer),
  public.supplier_work_review_list(uuid,uuid,integer,integer),
  public.supplier_work_qualify(uuid,uuid,timestamptz,text,text,uuid),
  public.supplier_work_request_clarification(uuid,uuid,integer,text)
  to service_role;
