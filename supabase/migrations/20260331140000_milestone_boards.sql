-- Registry of milestone boards (drives URLs + isolation via milestones.board_id).
CREATE TABLE IF NOT EXISTS public.milestone_boards (
  id text PRIMARY KEY,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.milestone_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestone boards selectable" ON public.milestone_boards
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone boards insertable" ON public.milestone_boards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone boards updatable" ON public.milestone_boards
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone boards deletable" ON public.milestone_boards
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

INSERT INTO public.milestone_boards (id, label) VALUES ('motor-biz', 'Motor Biz')
ON CONFLICT (id) DO NOTHING;
