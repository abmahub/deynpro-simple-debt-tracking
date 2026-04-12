import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  total_amount: number;
  payment_method: string;
  date: string;
  created_at: string;
}

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  available: number;
}

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, customers(name), sale_items(id, quantity, unit_price, subtotal, products(name))')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, payment_method, customer_id }: {
      items: SaleItem[];
      payment_method: string;
      customer_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const total_amount = items.reduce((s, i) => s + i.subtotal, 0);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({ user_id: user.id, total_amount, payment_method, customer_id: customer_id || null })
        .select()
        .single();
      if (saleError) throw saleError;

      const saleItems = items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-low-stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
    },
  });
}
