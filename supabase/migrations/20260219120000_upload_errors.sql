-- Store rejected rows from CSV uploads so users can review and fix.

CREATE TABLE IF NOT EXISTS public.upload_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  source TEXT NOT NULL,
  workflow TEXT,
  raw_data JSONB NOT NULL,
  rejection_reason TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upload_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upload errors viewable by authenticated users"
  ON public.upload_errors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Upload errors insertable by authenticated users"
  ON public.upload_errors FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Upload errors deletable by authenticated users"
  ON public.upload_errors FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_upload_errors_company ON public.upload_errors(company_id);
CREATE INDEX idx_upload_errors_source ON public.upload_errors(source);
CREATE INDEX idx_upload_errors_workflow ON public.upload_errors(workflow);
CREATE INDEX idx_upload_errors_created_at ON public.upload_errors(created_at DESC);
