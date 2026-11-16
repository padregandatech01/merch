-- Persist invitation decisions in the same private timeline as chat.
alter table public.supplier_messages
  alter column sender_user_id drop not null,
  add column event_type text,
  drop constraint supplier_messages_sender_kind_check,
  add constraint supplier_messages_sender_kind_check check (
    (sender_kind in ('admin', 'supplier') and event_type is null and sender_user_id is not null)
    or (sender_kind = 'system' and event_type is not null and
        event_type in ('accepted', 'declined', 'revoked', 'reopened', 'completed') and sender_user_id is null)
  );

-- A system notice is activity from the side that took the decision. Keep the
-- existing read-marker and directory logic without treating the notice as a reply.
create or replace function loxada_internal.supplier_message_added()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  activity_side text := case
    when new.sender_kind <> 'system' then new.sender_kind
    when new.event_type in ('revoked', 'reopened') then 'admin'
    else 'supplier'
  end;
begin
  update public.supplier_relationships
  set status = case when new.sender_kind = 'supplier' and status = 'invited' then 'discussing' else status end,
      last_message_at = greatest(last_message_at, new.created_at),
      last_sender_kind = case
        when last_message_at is null or new.created_at >= last_message_at then activity_side
        else last_sender_kind
      end,
      updated_at = greatest(updated_at, now()),
      admin_read_at = case when activity_side = 'admin' then greatest(admin_read_at, new.created_at) else admin_read_at end,
      supplier_read_at = case when activity_side = 'supplier' then greatest(supplier_read_at, new.created_at) else supplier_read_at end
  where id = new.relationship_id
    and (new.sender_kind = 'system' or status not in ('declined', 'revoked'));
  if not found then
    raise exception using errcode = '55000', message = 'Supplier conversation is closed';
  end if;
  return new;
end
$$;

create function loxada_internal.supplier_relationship_notice()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  notice_type text := case
    when old.status in ('invited', 'discussing') and new.status in ('accepted', 'declined') then new.status
    when old.status in ('invited', 'discussing', 'accepted') and new.status = 'revoked' then 'revoked'
    when old.status in ('declined', 'revoked') and new.status = 'discussing' then 'reopened'
    when old.status = 'accepted' and new.status = 'completed' then 'completed'
  end;
  notice_body text := case notice_type
    when 'accepted' then 'The supplier accepted the invitation.'
    when 'declined' then 'The supplier declined the invitation.'
    when 'revoked' then 'The department revoked the invitation.'
    when 'reopened' then 'The department reopened the conversation.'
    when 'completed' then 'The supplier finished account setup.'
  end;
begin
  if notice_type is not null then
    insert into public.supplier_messages (relationship_id, sender_kind, body, event_type)
    values (new.id, 'system', notice_body, notice_type);
  end if;
  return new;
end
$$;
revoke all on function loxada_internal.supplier_relationship_notice() from public, anon, authenticated;
create trigger supplier_relationship_notice
after update of status on public.supplier_relationships
for each row when (old.status is distinct from new.status)
execute function loxada_internal.supplier_relationship_notice();

-- Publish only the row identifier and thread filter. The page re-fetches via
-- its existing authorization checks. RLS also applies to Realtime delivery.
alter publication supabase_realtime add table public.supplier_messages (id, relationship_id);
