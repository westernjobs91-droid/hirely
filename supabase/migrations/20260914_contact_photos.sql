-- Stores the profile image URL captured by the extension, not an image file.
-- Existing contacts ownership policies continue to apply.
alter table public.contacts add column if not exists photo_url text;
