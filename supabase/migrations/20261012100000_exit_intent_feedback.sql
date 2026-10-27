-- Exit intent feedback dashboard (/dashboard/exit-intent).
-- Already applied to the remote project on 2026-10-12; this file keeps the repo in sync.
-- Filled weekly from Slack #exit-intent-submission-notification by the Claude scheduled task "Exit Intent Weekly Sync".
-- Contact details (NRIC, phone, email, plate) are intentionally NOT stored.

create table if not exists public.exit_intent_clusters (
  code text primary key,
  name text not null,
  group_key text not null check (group_key in ('pri','price','bug','req','ux','other')),
  is_priority boolean not null default false,
  sort_order int not null default 0,
  tagging_rule text not null
);

create table if not exists public.exit_intent_subclusters (
  id serial primary key,
  cluster_code text not null references public.exit_intent_clusters(code) on update cascade,
  name text not null,
  sort_order int not null default 0,
  tagging_rule text,
  unique (cluster_code, name)
);

create table if not exists public.exit_intent_submissions (
  slack_ts text primary key,
  submitted_at timestamptz not null,
  quotation_id text,
  quotation_url text,
  customer_category text,
  feedback text not null,
  feedback_gloss text,
  cluster_code text not null references public.exit_intent_clusters(code) on update cascade,
  subcluster_id int references public.exit_intent_subclusters(id),
  tag_note text,
  is_test boolean not null default false,
  tagged_by text not null default 'claude-weekly-sync',
  tagged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exit_intent_submissions_submitted_at_idx on public.exit_intent_submissions (submitted_at);
create index if not exists exit_intent_submissions_cluster_idx on public.exit_intent_submissions (cluster_code);

create table if not exists public.exit_intent_notes (
  period_month date primary key check (extract(day from period_month) = 1),
  title text not null,
  subtitle text,
  items jsonb not null default '[]'::jsonb,
  as_of timestamptz not null default now(),
  is_final boolean not null default false,
  written_by text not null default 'claude-weekly-sync',
  updated_at timestamptz not null default now()
);

create table if not exists public.exit_intent_sync_runs (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  window_from timestamptz,
  window_to timestamptz,
  rows_inserted int not null default 0,
  caught_up boolean not null default true,
  note text
);

create or replace function public.set_updated_at_exit_intent()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_exit_intent_submissions_updated_at on public.exit_intent_submissions;
create trigger trg_exit_intent_submissions_updated_at before update on public.exit_intent_submissions
for each row execute function public.set_updated_at_exit_intent();
drop trigger if exists trg_exit_intent_notes_updated_at on public.exit_intent_notes;
create trigger trg_exit_intent_notes_updated_at before update on public.exit_intent_notes
for each row execute function public.set_updated_at_exit_intent();

alter table public.exit_intent_clusters enable row level security;
alter table public.exit_intent_subclusters enable row level security;
alter table public.exit_intent_submissions enable row level security;
alter table public.exit_intent_notes enable row level security;
alter table public.exit_intent_sync_runs enable row level security;

drop policy if exists "exit_intent_clusters_read_authenticated" on public.exit_intent_clusters;
create policy "exit_intent_clusters_read_authenticated" on public.exit_intent_clusters for select to authenticated using (true);
drop policy if exists "exit_intent_subclusters_read_authenticated" on public.exit_intent_subclusters;
create policy "exit_intent_subclusters_read_authenticated" on public.exit_intent_subclusters for select to authenticated using (true);
drop policy if exists "exit_intent_submissions_read_authenticated" on public.exit_intent_submissions;
create policy "exit_intent_submissions_read_authenticated" on public.exit_intent_submissions for select to authenticated using (true);
drop policy if exists "exit_intent_notes_read_authenticated" on public.exit_intent_notes;
create policy "exit_intent_notes_read_authenticated" on public.exit_intent_notes for select to authenticated using (true);
drop policy if exists "exit_intent_sync_runs_read_authenticated" on public.exit_intent_sync_runs;
create policy "exit_intent_sync_runs_read_authenticated" on public.exit_intent_sync_runs for select to authenticated using (true);

-- Taxonomy (the weekly sync tags only against these rules).
insert into public.exit_intent_clusters (code,name,group_key,is_priority,sort_order,tagging_rule) values
('I','Specific insurer request','pri',true,1,'Customer names an insurer or insurer type they want, or says they cannot find a suitable insurer / too few options. If they mainly say an insurer is cheaper elsewhere, use P.'),
('A','Agreed Value request','pri',true,2,'Asks for Agreed Value instead of Market Value, or says the AV offered is too low.'),
('P','Price is too high','price',false,3,'Sticker shock, wants cheaper/cheapest, states a budget, disputes the sum insured, names a cheaper competitor, or saw the price change. "Cheaper please" under the "still comparing" category goes to C.'),
('B','Quote stuck / not loading','bug',false,4,'Quote never loads, slow, only some insurers return, edit/submit dead, third-party quote broken, provider down.'),
('D','Incorrect data on quote','bug',false,5,'Vehicle/customer data wrong or uneditable: model, vehicle type, effective date, NCD, marital status, ownership transfer, wants Third Party, postcode, NRIC.'),
('Y','Payment / checkout failed','bug',false,6,'Payment failed or not reflected, checkout dead, voucher/promo not working, payment method rejected.'),
('O','Add-on / coverage ask','req',false,7,'Wants a rider not visible/selectable: windscreen, towing, flood/special perils, drivers, e-hailing, road tax, NCD transfer.'),
('G','Confused, needs guidance','ux',false,8,'Unsure which plan/rider, asks what a plan includes, wants details, asks us to choose, asks how to pay monthly.'),
('C','Still comparing / browsing','other',false,9,'Window-shopping without a specific complaint.'),
('S','CS complaint','other',false,10,'Complaint about customer service, or asks for a CS number.'),
('L','Claims process','other',false,11,'Questions about claims or what to do after an accident.'),
('U','Not actionable','other',false,12,'Bare numbers, single words, car spec with no ask, garbled text, pure frustration.')
on conflict (code) do nothing;

insert into public.exit_intent_subclusters (cluster_code,name,sort_order) values
('I','Etiqa',1),('I','Takaful (any provider)',2),('I','Allianz',3),('I','MSIG',4),('I','Liberty / Kurnia',5),('I','Zurich',6),('I','Tokio Marine',7),('I','Generali',8),('I','Other named insurer',9),('I','None available / too few options',10),
('P','"Too expensive" (no specifics)',1),('P','Wants a discount / lower price',2),('P','Disputes the sum insured value',3),('P','Names a cheaper competitor',4),('P','Price changed between visits',5),
('B','Never loads / blank / no quote at all',1),('B','Slow / long wait',2),('B','Only some insurers return, rest stuck',3),('B','Edit / submit / continue not working',4),('B','Can''t compare insurers side by side',5),('B','Third-party quote type broken',6),
('D','Car model / type / spec wrong',1),('D','Effective date wrong',2),('D','NCD not applied / missing',3),('D','Marital status won’t update',4),('D','Ownership transfer not reflected',5),('D','Insurance type wanted, e.g. Third Party',6),('D','Vehicle type wrong',7),('D','Vehicle info wrong, unspecified',8),('D','Postcode wrong',9),('D','NRIC / IC issue',10),
('O','Windscreen / towing / flood / named driver',1),('O','E-hailing coverage',2),('O','Road tax / short-term cover',3),('O','NCD transfer between vehicles',4),('O','Other rider / coverage ask',5),
('G','Confused choosing a plan / rider',1),('G','Confused going through payment',2)
on conflict (cluster_code, name) do nothing;
