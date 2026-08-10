-- Bounce BTTS v1.4.0: add read-only guest/demo role.
-- Safe for existing members/admins. Guest is deliberately excluded from writes.

alter type public.member_role add value if not exists 'guest';

create or replace function private.is_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'guest'::public.member_role
      and p.active is true
      and p.approved is true
  );
$$;

drop policy if exists predictions_insert_own on public.predictions;
create policy predictions_insert_own on public.predictions
for insert to authenticated
with check (
  private.is_approved()
  and not private.is_guest()
  and member_id = (select auth.uid())
);

drop policy if exists predictions_update_own on public.predictions;
create policy predictions_update_own on public.predictions
for update to authenticated
using (
  private.is_approved()
  and not private.is_guest()
  and member_id = (select auth.uid())
)
with check (
  private.is_approved()
  and not private.is_guest()
  and member_id = (select auth.uid())
);

drop policy if exists predictions_delete_own on public.predictions;
create policy predictions_delete_own on public.predictions
for delete to authenticated
using (
  private.is_approved()
  and not private.is_guest()
  and member_id = (select auth.uid())
);
