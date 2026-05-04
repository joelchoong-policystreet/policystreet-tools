-- If an older version of 20260504120000 created date_text / new_leads_cnt, drop them so staging matches the current CSV layout.
alter table public.consumer_data_daily_staging
  drop column if exists date_text,
  drop column if exists new_leads_cnt;
