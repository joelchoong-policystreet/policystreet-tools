-- Transform/sync import table into the constrained dashboard table.
-- Run this after each CSV upload to public.consumer_data_import.

create or replace function public.sync_consumer_data_import_to_daily()
returns bigint
language plpgsql
as $$
declare
  v_affected bigint;
begin
  insert into public.consumer_data_daily (
    date,
    quotation_cnt,
    request_cnt,
    policy_cnt,
    new_policy,
    returning_policy,
    total_amount,
    new_customer_amount,
    returning_customer_amount
  )
  select
    i.date,
    coalesce(i.quotation_cnt, 0),
    coalesce(i.request_cnt, 0),
    coalesce(i.policy_cnt, 0),
    coalesce(i.new_policy, 0),
    coalesce(i.returning_policy, 0),
    coalesce(i.total_amount, 0),
    coalesce(i.new_customer_amount, 0),
    coalesce(i.returning_customer_amount, 0)
  from public.consumer_data_import i
  where i.date is not null
  on conflict (date) do update
  set
    quotation_cnt = excluded.quotation_cnt,
    request_cnt = excluded.request_cnt,
    policy_cnt = excluded.policy_cnt,
    new_policy = excluded.new_policy,
    returning_policy = excluded.returning_policy,
    total_amount = excluded.total_amount,
    new_customer_amount = excluded.new_customer_amount,
    returning_customer_amount = excluded.returning_customer_amount;

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$$;
