-- Field history for imotorbike_billing_normalised: track changes to editable fields
CREATE TABLE IF NOT EXISTS public.imotorbike_billing_field_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalised_id uuid NOT NULL REFERENCES public.imotorbike_billing_normalised(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_imotorbike_field_history_normalised_id
  ON public.imotorbike_billing_field_history(normalised_id);

CREATE INDEX idx_imotorbike_field_history_changed_at
  ON public.imotorbike_billing_field_history(changed_at DESC);

ALTER TABLE public.imotorbike_billing_field_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Field history viewable by authenticated"
  ON public.imotorbike_billing_field_history FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Field history insert by authenticated"
  ON public.imotorbike_billing_field_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
