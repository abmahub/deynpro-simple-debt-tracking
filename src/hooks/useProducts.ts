import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbSelectOne, dbInsert, dbUpdate, dbDelete, attachOne } from '@/lib/data';

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
      const products = await dbSelect<Product>('products', { orderBy: { column: 'name' } });
      return await attachOne(products, 'supplier_id', 'suppliers', 'suppliers', ['name']) as
        (Product & { suppliers: { name: string } | null })[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const p = await dbSelectOne<Product>('products', { id });
      if (!p) throw new Error('Product not found');
      const [withRel] = await attachOne([p], 'supplier_id', 'suppliers', 'suppliers', ['name']);
      return withRel as Product & { suppliers: { name: string } | null };
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products-low-stock'],
    queryFn: async () => {
      const data = await dbSelect<Product>('products', { orderBy: { column: 'quantity' } });
      return data.filter((p) => p.quantity <= p.low_stock_threshold);
    },
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'user_id'>) => {
      return await dbInsert<Product>('products', product as any);
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
      await dbUpdate('products', id, updates);
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
      await dbDelete('products', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-low-stock'] });
    },
  });
}
