-- Add workflow column to identify which tab/project the upload came from (e.g. imotorbike).

ALTER TABLE public.upload_errors
  ADD COLUMN IF NOT EXISTS workflow TEXT;

CREATE INDEX IF NOT EXISTS idx_upload_errors_workflow ON public.upload_errors(workflow);
