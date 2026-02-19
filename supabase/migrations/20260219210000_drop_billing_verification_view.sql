-- Remove verification view and helper functions (no longer used).
DROP VIEW IF EXISTS public.insurer_billing_with_verification;
DROP FUNCTION IF EXISTS public.parse_ocr_date_to_iso(text);
DROP FUNCTION IF EXISTS public.norm_vehicle(text);
