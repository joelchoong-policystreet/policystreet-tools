-- Step 1: Add verification_status column if it doesn't already exist
ALTER TABLE public.imotorbike_billing_normalised
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';

-- Step 2: Allow authenticated users to update verification_status
-- (The table previously only had a SELECT policy, which silently blocked frontend writes)
DROP POLICY IF EXISTS "Normalised billing update by authenticated" ON public.imotorbike_billing_normalised;

CREATE POLICY "Normalised billing update by authenticated"
  ON public.imotorbike_billing_normalised FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
