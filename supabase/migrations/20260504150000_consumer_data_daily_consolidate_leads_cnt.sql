-- Step 1: copy new_leads_cnt into leads_cnt (both columns must exist on consumer_data_daily).
-- Step 2: do nothing (no view changes, no dropping columns).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consumer_data_daily'
      and column_name = 'new_leads_cnt'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consumer_data_daily'
      and column_name = 'leads_cnt'
  ) then
    execute 'update public.consumer_data_daily set leads_cnt = coalesce(new_leads_cnt, leads_cnt, 0)';
  end if;
end $$;

-- Step 2: intentionally left blank.
