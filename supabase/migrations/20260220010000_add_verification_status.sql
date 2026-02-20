-- Add verification_status column to imotorbike_billing_normalised
-- Possible values: 'pending' | 'cancelled_not_billed' | 'cancelled_billed'
ALTER TABLE public.imotorbike_billing_normalised
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';
