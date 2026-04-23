import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ShopSettings {
  id: string;
  user_id: string;
  shop_name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

export function useShopSettings() {
  return useQuery({
    queryKey: ['shop_settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ShopSettings | null;
    },
  });
}

export function useSaveShopSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shop_name: string; phone?: string; address?: string; logo_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('shop_settings')
        .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop_settings'] }),
  });
}