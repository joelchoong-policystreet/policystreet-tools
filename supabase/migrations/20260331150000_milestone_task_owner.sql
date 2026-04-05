-- Subtask (milestone task) owner — free-text name, same spirit as milestone driver/PIC.
ALTER TABLE public.milestone_tasks
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.milestone_tasks.owner IS 'Person responsible for this subtask (display name).';
