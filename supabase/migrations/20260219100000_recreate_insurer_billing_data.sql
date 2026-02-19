-- Recreate insurer_billing_data so it matches the app (CSV upload for Allianz & Generali).
-- Run this in Supabase SQL Editor if your table was recreated with different columns and uploads fail.

DROP TABLE IF EXISTS public.insurer_billing_data;

CREATE TABLE public.insurer_billing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project TEXT,
  insurer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  row_number TEXT,
  policy_no TEXT,
  client_name TEXT,
  vehicle_no TEXT,
  status TEXT,
  sum_insured NUMERIC,

  cn_no TEXT,
  account_no TEXT,
  issue_date DATE,
  issued_by TEXT,
  type TEXT,
  effective_date DATE,
  expiry_date DATE,
  vehicle_type TEXT,
  coverage_type TEXT,
  chassis TEXT,
  jpj_status TEXT,
  gross_premium NUMERIC,
  rebate NUMERIC,
  gst NUMERIC,
  service_tax NUMERIC,
  stamp NUMERIC,
  premium_due NUMERIC,
  commission NUMERIC,
  gst_commission NUMERIC,
  nett_premium NUMERIC,
  amount_payable NUMERIC,
  ptv_amount NUMERIC,
  premium_due_after_ptv NUMERIC,

  agent_code TEXT,
  user_id TEXT,
  transaction_date DATE,
  transaction_time TEXT,
  class_product TEXT,
  quotation TEXT,
  repl_prev_no TEXT,
  trx_status TEXT,
  total_amount NUMERIC
);

ALTER TABLE public.insurer_billing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing data viewable by authenticated users"
  ON public.insurer_billing_data FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Billing data insertable by authenticated users"
  ON public.insurer_billing_data FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Billing data deletable by authenticated users"
  ON public.insurer_billing_data FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_billing_company ON public.insurer_billing_data(company_id);
CREATE INDEX idx_billing_insurer ON public.insurer_billing_data(insurer);
