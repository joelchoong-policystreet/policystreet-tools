-- Allow any authenticated user to list active profiles (PIC pickers, directory UIs).
-- Own-row and admin policies remain; this adds read access for active users only.
CREATE POLICY "Authenticated users can read active profiles for directory"
  ON public.profiles FOR SELECT TO authenticated
  USING (status = 'active');
