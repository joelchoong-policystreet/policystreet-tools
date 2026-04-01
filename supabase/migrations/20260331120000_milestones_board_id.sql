-- Scope milestones to boards (Motor Biz first; add new board ids in app config for a clean slate).
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS board_id text NOT NULL DEFAULT 'motor-biz';

CREATE INDEX IF NOT EXISTS milestones_board_id_idx ON public.milestones (board_id);
