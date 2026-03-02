-- Fix RLS: imotorbike_billing_normalised had no INSERT/DELETE policies.
-- The sync triggers (sync_billing_to_normalised, sync_ocr_to_normalised) insert/delete
-- when insurer_billing_data or ocr_data_table change. Without these policies,
-- the trigger's operations fail with "new row violates row-level security policy".

CREATE POLICY "Normalised billing insertable by sync"
  ON public.imotorbike_billing_normalised FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Normalised billing deletable by sync"
  ON public.imotorbike_billing_normalised FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
