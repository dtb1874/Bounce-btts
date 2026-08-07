-- Adds two administrator levels. Run in order on existing projects.
alter type public.member_role add value if not exists 'ultimate_admin' before 'admin';

-- Run the statements below after the enum-value migration has committed.
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and approved = true and active = true and role in ('ultimate_admin','admin')); $$;

create or replace function private.is_ultimate_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and approved = true and active = true and role = 'ultimate_admin'); $$;

update public.profiles set role='ultimate_admin' where slot_number=1;
update public.profiles set role='admin' where slot_number=2 and role <> 'ultimate_admin';
