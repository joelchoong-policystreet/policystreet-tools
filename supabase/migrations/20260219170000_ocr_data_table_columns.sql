-- Recreate ocr_data_table with columns matching the iMotorbike OCR CSV (no raw_data JSONB).

DROP TABLE IF EXISTS public.ocr_data_table;

CREATE TABLE public.ocr_data_table (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  date_issue TEXT,
  vehicle_no TEXT,
  insured_name TEXT,
  insured_ic_no TEXT,
  insurer_contact_no TEXT,
  insured_email TEXT,
  vehicle_make_model TEXT,
  type_of_cover TEXT,
  sum_insured TEXT,
  premium TEXT,
  ncd TEXT,
  total_base_premium TEXT,
  total_extra_coverage TEXT,
  gross_premium TEXT,
  service_tax TEXT,
  stamp_duty TEXT,
  total_amount_payable_rounded TEXT,
  insurer TEXT,
  file_name TEXT,
  created_timestamp TEXT,
  formatted_timestamp TEXT,
  process_duration TEXT
);

ALTER TABLE public.ocr_data_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OCR data viewable by authenticated users"
  ON public.ocr_data_table FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "OCR data insertable by authenticated users"
  ON public.ocr_data_table FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "OCR data updatable by authenticated users"
  ON public.ocr_data_table FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "OCR data deletable by authenticated users"
  ON public.ocr_data_table FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_ocr_data_table_company ON public.ocr_data_table(company_id);
CREATE INDEX idx_ocr_data_table_project ON public.ocr_data_table(project);
CREATE INDEX idx_ocr_data_table_created_at ON public.ocr_data_table(created_at);
