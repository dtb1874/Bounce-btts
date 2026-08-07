insert into public.seasons (label, is_current, starts_at, ends_at)
select '2024/25', false, '2024-07-01'::date, '2025-06-30'::date
where not exists (select 1 from public.seasons where label = '2024/25');

insert into public.seasons (label, is_current, starts_at, ends_at)
select '2025/26', false, '2025-07-01'::date, '2026-06-30'::date
where not exists (select 1 from public.seasons where label = '2025/26');
