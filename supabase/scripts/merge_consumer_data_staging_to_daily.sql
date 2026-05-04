-- MANUAL: Run in Supabase SQL editor (or psql) after uploading rows into public.consumer_data_daily_staging.
--
-- 1) Wipes all rows in public.consumer_data_daily.
-- 2) Reloads from staging into consumer_data_daily.leads_cnt (one row per date; latest staging row wins on duplicates).
--
-- Requires consumer_data_daily to have column leads_cnt (dashboard “Leads count”).
-- Optional after success: truncate public.consumer_data_daily_staging;

begin;

truncate table public.consumer_data_daily;

insert into public.consumer_data_daily (
  date,
  leads_cnt,
  request_cnt,
  policy_cnt,
  new_policy,
  returning_policy,
  total_amount,
  new_customer_amount,
  returning_customer_amount
)
select distinct on (s.date)
  s.date,
  coalesce(s.leads_cnt, 0)::integer,
  coalesce(s.request_cnt, 0)::integer,
  coalesce(s.policy_cnt, 0)::integer,
  coalesce(s.new_policy, 0)::integer,
  coalesce(s.returning_policy, 0)::integer,
  coalesce(s.total_amount, 0)::numeric(18, 2),
  coalesce(s.new_customer_amount, 0)::numeric(18, 2),
  coalesce(s.returning_customer_amount, 0)::numeric(18, 2)
from public.consumer_data_daily_staging s
where s.date is not null
order by s.date, s.id desc;

commit;
