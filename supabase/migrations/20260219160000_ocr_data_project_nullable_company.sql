-- Add project column to ocr_data_table for scoping by project (imotorbike, carsome).
-- OCR data is stored as raw_data JSONB (exact CSV row).

ALTER TABLE public.ocr_data_table
  ADD COLUMN IF NOT EXISTS project TEXT;

CREATE INDEX IF NOT EXISTS idx_ocr_data_table_project ON public.ocr_data_table(project);
