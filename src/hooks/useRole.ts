import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data.role as 'admin' | 'customer';
    },
  });
}

export function useIsAdmin() {
  const { data: role, isLoading } = useRole();
  return { isAdmin: role === 'admin', isLoading };
}
