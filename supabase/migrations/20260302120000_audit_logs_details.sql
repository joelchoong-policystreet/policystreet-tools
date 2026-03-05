-- Add optional details column for before/after values in audit logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS details jsonb;

COMMENT ON COLUMN public.audit_logs.details IS 'Stores before/after or change details, e.g. { before, after } or { changes: [{ field, before, after }] }';
