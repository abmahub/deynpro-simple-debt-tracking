import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbUpdate, isElectron } from '@/lib/data';
import { electronDB } from '@/lib/electronDB';
import { supabase } from '@/lib/supabase';

export interface StockAlert {
  id: string;
  user_id: string;
  product_id: string;
  alert_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const all = await dbSelect<StockAlert>('stock_alerts', {
        orderBy: { column: 'created_at', ascending: false },
      });
      // SQLite stores booleans as 0/1 — accept both.
      const unread = all.filter((a: any) => a.is_read === false || a.is_read === 0);
      const productIds = Array.from(new Set(unread.map((a) => a.product_id)));
      let productsMap = new Map<string, { name: string }>();
      if (productIds.length > 0) {
        if (isElectron()) {
          const prods = await electronDB.select('products');
          for (const p of prods as any[]) {
            if (productIds.includes(p.id)) productsMap.set(p.id, { name: p.name });
          }
        } else {
          const { data } = await supabase.from('products').select('id, name').in('id', productIds);
          for (const p of data || []) productsMap.set(p.id, { name: p.name });
        }
      }
      return unread.map((a) => ({ ...a, products: productsMap.get(a.product_id) || { name: '?' } })) as
        (StockAlert & { products: { name: string } })[];
    },
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dbUpdate('stock_alerts', id, { is_read: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-alerts'] }),
  });
}

export function useMarkAllAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Update each unread alert through the adapter so it works offline.
      const all = await dbSelect<StockAlert>('stock_alerts');
      const unread = all.filter((a: any) => a.is_read === false || a.is_read === 0);
      for (const a of unread) await dbUpdate('stock_alerts', a.id, { is_read: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-alerts'] }),
  });
}
