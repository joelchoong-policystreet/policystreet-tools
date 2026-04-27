-- Consumer Data dashboard source table
-- Source CSV columns:
-- date,quotation_cnt,request_cnt,policy_cnt,new_policy,returning_policy,total_amount,new_customer_amount,returning_customer_amount

create table if not exists public.consumer_data_daily (
  date date primary key,
  quotation_cnt integer not null default 0,
  request_cnt integer not null default 0,
  policy_cnt integer not null default 0,
  new_policy integer not null default 0,
  returning_policy integer not null default 0,
  total_amount numeric(18, 2) not null default 0,
  new_customer_amount numeric(18, 2) not null default 0,
  returning_customer_amount numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumer_data_daily_non_negative_counts check (
    quotation_cnt >= 0
    and request_cnt >= 0
    and policy_cnt >= 0
    and new_policy >= 0
    and returning_policy >= 0
  )
);

create index if not exists idx_consumer_data_daily_date on public.consumer_data_daily (date);

create or replace function public.set_updated_at_consumer_data_daily()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_consumer_data_daily_updated_at on public.consumer_data_daily;
create trigger trg_consumer_data_daily_updated_at
before update on public.consumer_data_daily
for each row execute function public.set_updated_at_consumer_data_daily();

-- Aggregated helper view for year / month / week slicing in SQL.
-- You can filter by period_type and period_value from Supabase:
--   year:  period_type='year',  period_value='2026'
--   month: period_type='month', period_value='2026-04'
--   week:  period_type='week',  period_value='2026-W17'
create or replace view public.consumer_data_period_rollup as
with base as (
  select
    date,
    quotation_cnt,
    request_cnt,
    policy_cnt,
    new_policy,
    returning_policy,
    total_amount,
    new_customer_amount,
    returning_customer_amount,
    extract(year from date)::int as year_num,
    to_char(date, 'IYYY') as iso_year,
    to_char(date, 'IW') as iso_week
  from public.consumer_data_daily
)
select
  'year'::text as period_type,
  year_num::text as period_value,
  min(date) as period_start_date,
  max(date) as period_end_date,
  sum(quotation_cnt)::bigint as quotation_cnt,
  sum(request_cnt)::bigint as request_cnt,
  sum(policy_cnt)::bigint as policy_cnt,
  sum(new_policy)::bigint as new_policy,
  sum(returning_policy)::bigint as returning_policy,
  sum(total_amount)::numeric(18,2) as total_amount,
  sum(new_customer_amount)::numeric(18,2) as new_customer_amount,
  sum(returning_customer_amount)::numeric(18,2) as returning_customer_amount
from base
group by year_num

union all

select
  'month'::text as period_type,
  to_char(date, 'YYYY-MM') as period_value,
  min(date) as period_start_date,
  max(date) as period_end_date,
  sum(quotation_cnt)::bigint as quotation_cnt,
  sum(request_cnt)::bigint as request_cnt,
  sum(policy_cnt)::bigint as policy_cnt,
  sum(new_policy)::bigint as new_policy,
  sum(returning_policy)::bigint as returning_policy,
  sum(total_amount)::numeric(18,2) as total_amount,
  sum(new_customer_amount)::numeric(18,2) as new_customer_amount,
  sum(returning_customer_amount)::numeric(18,2) as returning_customer_amount
from base
group by to_char(date, 'YYYY-MM')

union all

select
  'week'::text as period_type,
  concat(iso_year, '-W', iso_week) as period_value,
  min(date) as period_start_date,
  max(date) as period_end_date,
  sum(quotation_cnt)::bigint as quotation_cnt,
  sum(request_cnt)::bigint as request_cnt,
  sum(policy_cnt)::bigint as policy_cnt,
  sum(new_policy)::bigint as new_policy,
  sum(returning_policy)::bigint as returning_policy,
  sum(total_amount)::numeric(18,2) as total_amount,
  sum(new_customer_amount)::numeric(18,2) as new_customer_amount,
  sum(returning_customer_amount)::numeric(18,2) as returning_customer_amount
from base
group by iso_year, iso_week;

-- Make sure the view runs with caller permissions so table RLS is enforced.
alter view public.consumer_data_period_rollup set (security_invoker = true);

-- Optional: enable authenticated users to read this table/view in Supabase.
alter table public.consumer_data_daily enable row level security;

drop policy if exists "consumer_data_daily_read_authenticated" on public.consumer_data_daily;
create policy "consumer_data_daily_read_authenticated"
on public.consumer_data_daily
for select
to authenticated
using (true);

