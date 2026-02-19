-- Add project column to scope billing data per project (imotorbike, carsome, etc).

ALTER TABLE public.insurer_billing_data
  ADD COLUMN IF NOT EXISTS project TEXT;

CREATE INDEX IF NOT EXISTS idx_billing_project ON public.insurer_billing_data(project);
