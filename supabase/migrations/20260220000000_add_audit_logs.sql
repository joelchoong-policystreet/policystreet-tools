-- Create auditLogs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    time timestamptz NOT NULL DEFAULT now(),
    user_name text NOT NULL,
    event_type text NOT NULL,
    change text NOT NULL,
    item_affected text NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs (needed for frontend tracking of exports/imports)
CREATE POLICY "Enable insert for authenticated users" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow admins to read logs (checked via user_roles table)
CREATE POLICY "Enable read for admin users" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);


-- Create a database function to automatically log changes
CREATE OR REPLACE FUNCTION public.log_database_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_active_user text;
BEGIN
    -- Attempt to find the name of the user making the change
    SELECT COALESCE(name, email, 'System') INTO v_active_user 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_active_user IS NULL THEN
        v_active_user := 'System';
    END IF;

    -- Track User Profile changes (Admin Users page)
    IF TG_TABLE_NAME = 'profiles' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO public.audit_logs (user_name, event_type, change, item_affected)
            VALUES (v_active_user, 'User', 'User added', NEW.email);
        ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_name, event_type, change, item_affected)
            VALUES (v_active_user, 'User', 'Status changed to ' || NEW.status, NEW.name);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map the function to the profiles table
DROP TRIGGER IF EXISTS trigger_audit_profiles ON public.profiles;
CREATE TRIGGER trigger_audit_profiles
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_database_changes();
