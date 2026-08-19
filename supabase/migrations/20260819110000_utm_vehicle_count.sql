-- Vehicle requests -> sales conversion dashboard source table
-- Source spreadsheet columns:
-- Request Date,Total Requests,Total Vehicle No (not unique),Total Sales,Conversion % (Sales/Vehicle)
-- Conversion % is derived (total_sales / total_vehicle_no) and computed client-side, not stored.

create table if not exists public.utm_vehicle_count (
  request_date date primary key,
  total_requests integer not null default 0,
  total_vehicle_no integer not null default 0,
  total_sales integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint utm_vehicle_count_non_negative_counts check (
    total_requests >= 0
    and total_vehicle_no >= 0
    and total_sales >= 0
  )
);

create or replace function public.set_updated_at_utm_vehicle_count()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_utm_vehicle_count_updated_at on public.utm_vehicle_count;
create trigger trg_utm_vehicle_count_updated_at
before update on public.utm_vehicle_count
for each row execute function public.set_updated_at_utm_vehicle_count();

alter table public.utm_vehicle_count enable row level security;

drop policy if exists "utm_vehicle_count_read_authenticated" on public.utm_vehicle_count;
create policy "utm_vehicle_count_read_authenticated"
on public.utm_vehicle_count
for select
to authenticated
using (true);
