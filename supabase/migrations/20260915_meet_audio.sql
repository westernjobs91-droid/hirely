begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hirely-meet-audio','hirely-meet-audio',false,25165824,
array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/wave','audio/webm','video/webm','audio/ogg','application/ogg','audio/flac','audio/x-flac','video/mp4'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists hirely_audio_insert on storage.objects;
create policy hirely_audio_insert on storage.objects for insert to authenticated
with check(bucket_id='hirely-meet-audio' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists hirely_audio_read on storage.objects;
create policy hirely_audio_read on storage.objects for select to authenticated
using(bucket_id='hirely-meet-audio' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists hirely_audio_delete on storage.objects;
create policy hirely_audio_delete on storage.objects for delete to authenticated
using(bucket_id='hirely-meet-audio' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
