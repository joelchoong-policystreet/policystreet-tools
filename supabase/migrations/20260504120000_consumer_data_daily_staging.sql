-- Staging table for bulk CSV / sheet uploads before merging into public.consumer_data_daily.
-- Expected CSV headers:
--   date,leads_cnt,request_cnt,policy_cnt,new_policy,returning_policy,total_amount,new_customer_amount,returning_customer_amount
-- On merge, staging.leads_cnt is written to consumer_data_daily.leads_cnt (dashboard “Leads count”).

create table if not exists public.consumer_data_daily_staging (
  id bigserial primary key,
  uploaded_at timestamptz not null default now(),
  date date,
  leads_cnt integer,
  request_cnt integer,
  policy_cnt integer,
  new_policy integer,
  returning_policy integer,
  total_amount numeric(18, 2),
  new_customer_amount numeric(18, 2),
  returning_customer_amount numeric(18, 2)
);

create index if not exists idx_consumer_data_daily_staging_date on public.consumer_data_daily_staging (date);
create index if not exists idx_consumer_data_daily_staging_uploaded_at on public.consumer_data_daily_staging (uploaded_at desc);

alter table public.consumer_data_daily_staging enable row level security;

drop policy if exists "consumer_data_daily_staging_read_authenticated" on public.consumer_data_daily_staging;
create policy "consumer_data_daily_staging_read_authenticated"
on public.consumer_data_daily_staging
for select
to authenticated
using (true);
