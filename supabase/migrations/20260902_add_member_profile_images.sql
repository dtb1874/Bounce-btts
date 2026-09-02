alter table public.profiles add column if not exists avatar_original_path text;
alter table public.profiles add column if not exists avatar_portrait_path text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-images','profile-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
