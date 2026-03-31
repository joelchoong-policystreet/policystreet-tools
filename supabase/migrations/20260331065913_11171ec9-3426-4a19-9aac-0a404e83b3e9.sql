
-- Enable RLS on all milestone tables
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_updates ENABLE ROW LEVEL SECURITY;

-- milestones
CREATE POLICY "Milestones viewable by authenticated" ON public.milestones FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Milestones insertable by authenticated" ON public.milestones FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestones updatable by authenticated" ON public.milestones FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestones deletable by authenticated" ON public.milestones FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- milestone_tags
CREATE POLICY "Milestone tags viewable by authenticated" ON public.milestone_tags FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone tags insertable by authenticated" ON public.milestone_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone tags updatable by authenticated" ON public.milestone_tags FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone tags deletable by authenticated" ON public.milestone_tags FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- milestone_tasks
CREATE POLICY "Milestone tasks viewable by authenticated" ON public.milestone_tasks FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone tasks insertable by authenticated" ON public.milestone_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone tasks updatable by authenticated" ON public.milestone_tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone tasks deletable by authenticated" ON public.milestone_tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- milestone_task_checklist_items
CREATE POLICY "Checklist items viewable by authenticated" ON public.milestone_task_checklist_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Checklist items insertable by authenticated" ON public.milestone_task_checklist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Checklist items updatable by authenticated" ON public.milestone_task_checklist_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Checklist items deletable by authenticated" ON public.milestone_task_checklist_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- milestone_updates
CREATE POLICY "Milestone updates viewable by authenticated" ON public.milestone_updates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone updates insertable by authenticated" ON public.milestone_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone updates updatable by authenticated" ON public.milestone_updates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Milestone updates deletable by authenticated" ON public.milestone_updates FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
