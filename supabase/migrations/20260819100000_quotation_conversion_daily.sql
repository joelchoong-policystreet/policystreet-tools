-- Quotation conversion dashboard source table
-- Source spreadsheet columns:
-- request_date,converted_requests,not_converted_requests,total_requests,avg_insurers_converted,avg_insurers_not_converted

create table if not exists public.quotation_conversion_daily (
  request_date date primary key,
  converted_requests integer not null default 0,
  not_converted_requests integer not null default 0,
  total_requests integer not null default 0,
  avg_insurers_converted numeric(6, 2) not null default 0,
  avg_insurers_not_converted numeric(6, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_conversion_daily_non_negative_counts check (
    converted_requests >= 0
    and not_converted_requests >= 0
    and total_requests >= 0
  ),
  constraint quotation_conversion_daily_totals_match check (
    total_requests = converted_requests + not_converted_requests
  )
);

create or replace function public.set_updated_at_quotation_conversion_daily()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_quotation_conversion_daily_updated_at on public.quotation_conversion_daily;
create trigger trg_quotation_conversion_daily_updated_at
before update on public.quotation_conversion_daily
for each row execute function public.set_updated_at_quotation_conversion_daily();

-- Optional: enable authenticated users to read this table in Supabase.
alter table public.quotation_conversion_daily enable row level security;

drop policy if exists "quotation_conversion_daily_read_authenticated" on public.quotation_conversion_daily;
create policy "quotation_conversion_daily_read_authenticated"
on public.quotation_conversion_daily
for select
to authenticated
using (true);
