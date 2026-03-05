import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";
import { useAuth } from "./useAuth";

export function useIsAdmin() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data: row } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!row;
    },
    enabled: !!user?.id,
  });

  return { isAdmin: !!data, isLoading };
}
