-- Migration: Rename verification statuses and 'heal' existing data
-- cancelled_not_billed -> cancelled
-- cancelled_billed -> cancelled_but_billed

-- 1. Update existing mappings
UPDATE public.imotorbike_billing_normalised
SET verification_status = 'cancelled'
WHERE verification_status = 'cancelled_not_billed';

UPDATE public.imotorbike_billing_normalised
SET verification_status = 'cancelled_but_billed'
WHERE verification_status = 'cancelled_billed';

-- 2. Data Healing: Mark records with full OCR data as 'completed' if they are currently 'pending'
UPDATE public.imotorbike_billing_normalised
SET verification_status = 'completed'
WHERE verification_status = 'pending'
  AND total_amount_payable IS NOT NULL
  AND total_amount_payable != '';

-- Note: This ensures that the "all pending" issue is resolved for existing data.
