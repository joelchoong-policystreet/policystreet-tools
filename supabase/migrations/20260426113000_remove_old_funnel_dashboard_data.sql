-- Removes old quotation/updated funnel Supabase objects and data.
-- Does NOT touch consumer_data_daily / consumer_data_import tables.

do $$
begin
  -- Legacy source object used by old funnel dashboard.
  if to_regclass('public.mv_raw_data_daily_funnel') is not null then
    execute 'drop materialized view if exists public.mv_raw_data_daily_funnel';
  end if;

  -- Guarded cleanup for possible legacy table names.
  if to_regclass('public.raw_data_daily_funnel') is not null then
    execute 'drop table if exists public.raw_data_daily_funnel';
  end if;

  if to_regclass('public.quotation_weekday_funnel') is not null then
    execute 'drop table if exists public.quotation_weekday_funnel';
  end if;
end $$;
