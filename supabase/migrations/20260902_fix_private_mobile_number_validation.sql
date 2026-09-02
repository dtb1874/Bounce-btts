alter table public.profile_private_details
  drop constraint if exists profile_private_details_mobile_number_check;

alter table public.profile_private_details
  add constraint profile_private_details_mobile_number_check
  check (mobile_number is null or mobile_number ~ '^\+[1-9][0-9]{7,14}$');
