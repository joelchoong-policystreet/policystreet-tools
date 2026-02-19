-- Insurer billing data: for cross-referencing with issuance data (e.g. iMotorbike)
CREATE TABLE public.insurer_billing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  billing_date TIMESTAMP WITH TIME ZONE,
  reference_number TEXT,
  insurer TEXT,
  amount TEXT,
  policy_number TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insurer_billing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insurer billing data are viewable by everyone"
  ON public.insurer_billing_data FOR SELECT USING (true);
CREATE POLICY "Insurer billing data can be inserted by authenticated users"
  ON public.insurer_billing_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Insurer billing data can be updated by authenticated users"
  ON public.insurer_billing_data FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Insurer billing data can be deleted by authenticated users"
  ON public.insurer_billing_data FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_insurer_billing_data_company_id ON public.insurer_billing_data(company_id);
CREATE INDEX idx_insurer_billing_data_billing_date ON public.insurer_billing_data(billing_date);

-- OCR data: for cross-referencing (e.g. extracted document data)
CREATE TABLE public.ocr_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_reference TEXT,
  extracted_text TEXT,
  source_filename TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OCR data are viewable by everyone"
  ON public.ocr_data FOR SELECT USING (true);
CREATE POLICY "OCR data can be inserted by authenticated users"
  ON public.ocr_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "OCR data can be updated by authenticated users"
  ON public.ocr_data FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "OCR data can be deleted by authenticated users"
  ON public.ocr_data FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_ocr_data_company_id ON public.ocr_data(company_id);
CREATE INDEX idx_ocr_data_created_at ON public.ocr_data(created_at);
