import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { dbSelectOne, dbInsert, dbUpdate, isElectron } from '@/lib/data';

export interface ShopSettings {
  id: string;
  user_id: string;
  shop_name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

export function useShopSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shop_settings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return null;
      return await dbSelectOne<ShopSettings>('shop_settings', { user_id: user.id });
    },
  });
}

export function useSaveShopSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { shop_name: string; phone?: string; address?: string; logo_url?: string }) => {
      if (!user) throw new Error('Not authenticated');
      // Online path: keep using upsert for atomicity
      if (!isElectron()) {
        const { data, error } = await supabase
          .from('shop_settings')
          .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      // Electron / offline path: emulate upsert against local SQLite.
      const existing = await dbSelectOne<ShopSettings>('shop_settings', { user_id: user.id });
      if (existing) {
        await dbUpdate('shop_settings', existing.id, input);
        return { ...existing, ...input };
      }
      return await dbInsert<ShopSettings>('shop_settings', { ...input, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop_settings'] }),
  });
}