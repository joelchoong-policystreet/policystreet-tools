-- Import-first table: matches CSV columns exactly for reliable Supabase CSV upload.
-- CSV headers expected:
-- date,quotation_cnt,request_cnt,policy_cnt,new_policy,returning_policy,total_amount,new_customer_amount,returning_customer_amount

create table if not exists public.consumer_data_import (
  date date,
  quotation_cnt integer,
  request_cnt integer,
  policy_cnt integer,
  new_policy integer,
  returning_policy integer,
  total_amount numeric(18, 2),
  new_customer_amount numeric(18, 2),
  returning_customer_amount numeric(18, 2)
);

create index if not exists idx_consumer_data_import_date on public.consumer_data_import (date);

-- Optional read access for authenticated users.
alter table public.consumer_data_import enable row level security;

drop policy if exists "consumer_data_import_read_authenticated" on public.consumer_data_import;
create policy "consumer_data_import_read_authenticated"
on public.consumer_data_import
for select
to authenticated
using (true);
