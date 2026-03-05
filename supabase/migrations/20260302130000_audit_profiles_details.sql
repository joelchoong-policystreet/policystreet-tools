-- Update profiles trigger to include before/after in details for status changes
CREATE OR REPLACE FUNCTION public.log_database_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_active_user text;
    v_details jsonb;
BEGIN
    SELECT COALESCE(name, email, 'System') INTO v_active_user 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_active_user IS NULL THEN
        v_active_user := 'System';
    END IF;

    IF TG_TABLE_NAME = 'profiles' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO public.audit_logs (user_name, event_type, change, item_affected, details)
            VALUES (v_active_user, 'User', 'User added', NEW.email, NULL);
        ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
            v_details := jsonb_build_object(
                'before', OLD.status,
                'after', NEW.status
            );
            INSERT INTO public.audit_logs (user_name, event_type, change, item_affected, details)
            VALUES (v_active_user, 'User', 'Status changed to ' || NEW.status, NEW.name, v_details);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
