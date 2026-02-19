-- Add project and document_reference columns to ocr_data_table if missing.
-- document_reference: identifier for the document (e.g. vehicle no, policy ref from CSV).
-- project: scoping by project (imotorbike, carsome).

ALTER TABLE public.ocr_data_table
  ADD COLUMN IF NOT EXISTS project TEXT;

ALTER TABLE public.ocr_data_table
  ADD COLUMN IF NOT EXISTS document_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_ocr_data_table_project ON public.ocr_data_table(project);
