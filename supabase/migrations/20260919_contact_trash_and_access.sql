begin;

-- Additive: retain contact IDs and all related records. No automatic purge.
alter table public.contacts add column if not exists deleted_at timestamptz;
create index if not exists contacts_owner_trash_idx on public.contacts(user_id, deleted_at);
alter table public.contacts enable row level security;
alter table public.contacts force row level security;

-- Restrictive policies AND with existing permissive policies. An old broad
-- policy therefore cannot bypass ownership. Retain existing policies for audit.
drop policy if exists hirely_contacts_owner_guard on public.contacts;
create policy hirely_contacts_owner_guard on public.contacts as restrictive
  for all to public using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());
drop policy if exists hirely_contacts_owner_access on public.contacts;
create policy hirely_contacts_owner_access on public.contacts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists hirely_contacts_no_hard_delete on public.contacts;
create policy hirely_contacts_no_hard_delete on public.contacts as restrictive
  for delete to public using (false);
revoke all on public.contacts from anon;
revoke delete, truncate, references, trigger on public.contacts from authenticated;
grant select, insert, update on public.contacts to authenticated;

create or replace function public.hirely_guard_contact_update()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Contact ownership cannot be changed' using errcode = '42501';
  end if;
  if old.deleted_at is not null and (
    new.deleted_at is not null or
    (to_jsonb(new) - 'deleted_at' - 'updated_at') is distinct from
    (to_jsonb(old) - 'deleted_at' - 'updated_at')
  ) then
    raise exception 'Restore the contact before editing it' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.hirely_guard_contact_update() from public, anon, authenticated;
drop trigger if exists hirely_guard_contact_update on public.contacts;
create trigger hirely_guard_contact_update before update on public.contacts
  for each row execute function public.hirely_guard_contact_update();

-- The retired seed UI must not allow browser writes even through older clients.
-- Existing data stays available to server-side service-role consumers.
do $$
begin
  if to_regclass('public.company_cache') is not null then
    alter table public.company_cache enable row level security;
    alter table public.company_cache force row level security;
    revoke all on public.company_cache from anon, authenticated;
    drop policy if exists hirely_company_cache_server_only on public.company_cache;
    create policy hirely_company_cache_server_only on public.company_cache as restrictive
      for all to public using (false) with check (false);
  end if;
end;
$$;

commit;
