import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  price: number;
  cost_price: number;
  quantity: number;
  category: string | null;
  description: string | null;
  image_url: string | null;
  barcode: string | null;
  expiry_date: string | null;
  low_stock_threshold: number;
  supplier_id: string | null;
  created_at: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, suppliers(name)')
        .order('name');
      if (error) throw error;
      return data as (Product & { suppliers: { name: string } | null })[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, suppliers(name)').eq('id', id).single();
      if (error) throw error;
      return data as Product & { suppliers: { name: string } | null };
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products-low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('quantity');
      if (error) throw error;
      return (data || []).filter((p: Product) => p.quantity <= p.low_stock_threshold);
    },
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('products').insert({ ...product, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });
}
