create table if not exists public.profile_private_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  mobile_number text null,
  updated_at timestamptz not null default now()
);

alter table public.profile_private_details enable row level security;

revoke all on table public.profile_private_details from anon, authenticated;
grant all on table public.profile_private_details to service_role;

alter table public.profile_private_details
  drop constraint if exists profile_private_details_mobile_number_check;
alter table public.profile_private_details
  add constraint profile_private_details_mobile_number_check
  check (mobile_number is null or mobile_number ~ '^\+[1-9][0-9]{7,14}$');
