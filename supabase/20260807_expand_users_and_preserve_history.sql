alter table public.profiles drop constraint if exists profiles_slot_number_check;
alter table public.profiles add constraint profiles_slot_number_positive check (slot_number is null or slot_number > 0);
alter table public.season_memberships add column if not exists display_name_snapshot text;
update public.season_memberships sm set display_name_snapshot = p.display_name from public.profiles p where p.id = sm.profile_id and sm.display_name_snapshot is null;
alter table public.season_memberships alter column display_name_snapshot set not null;
