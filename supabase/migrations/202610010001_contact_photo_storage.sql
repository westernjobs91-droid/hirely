begin;

alter table public.contacts add column if not exists photo_path text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'hirely-contact-photos',
  'hirely-contact-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict(id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists hirely_contact_photos_insert on storage.objects;
create policy hirely_contact_photos_insert on storage.objects for insert to authenticated
with check(bucket_id = 'hirely-contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hirely_contact_photos_read on storage.objects;
create policy hirely_contact_photos_read on storage.objects for select to authenticated
using(bucket_id = 'hirely-contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hirely_contact_photos_update on storage.objects;
create policy hirely_contact_photos_update on storage.objects for update to authenticated
using(bucket_id = 'hirely-contact-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check(bucket_id = 'hirely-contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hirely_contact_photos_delete on storage.objects;
create policy hirely_contact_photos_delete on storage.objects for delete to authenticated
using(bucket_id = 'hirely-contact-photos' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
