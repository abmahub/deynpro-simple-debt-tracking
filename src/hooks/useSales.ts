import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbInsert, attachOne, attachMany } from '@/lib/data';

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
  cost_price: number;
}

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const sales = await dbSelect<Sale>('sales', {
        orderBy: { column: 'date', ascending: false },
      });
      const withCustomers = await attachOne(sales, 'customer_id', 'customers', 'customers', ['name']);
      const withItems = await attachMany(withCustomers as any[], 'id' as any, 'sale_items', 'sale_id', 'sale_items');
      // Attach product name onto each sale_item
      const allItems = (withItems as any[]).flatMap((s) => s.sale_items as any[]);
      const itemsWithProduct = await attachOne(allItems, 'product_id', 'products', 'products', ['name']);
      const byId = new Map(itemsWithProduct.map((i: any) => [i.id, i]));
      return (withItems as any[]).map((s) => ({
        ...s,
        sale_items: (s.sale_items as any[]).map((it) => byId.get(it.id) || it),
      }));
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
      const total_amount = items.reduce((s, i) => s + i.subtotal, 0);

      // 1) Create the sale row (adapter handles user_id + offline routing)
      const sale = await dbInsert<Sale>('sales', {
        total_amount,
        payment_method,
        customer_id: customer_id || null,
        date: new Date().toISOString(),
      });

      // 2) Insert each sale_item. In Electron the AFTER INSERT trigger on
      //    sale_items deducts product stock automatically (mirrors Supabase).
      for (const item of items) {
        await dbInsert('sale_items', {
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        } as any);
      }

      // 3) Credit sale → also create a debt transaction for the customer
      if (payment_method === 'credit' && customer_id) {
        await dbInsert('transactions', {
          customer_id,
          type: 'debt',
          amount: total_amount,
          description: `Credit sale #${sale.id.slice(0, 8)}`,
          date: new Date().toISOString(),
        } as any);
      }

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-low-stock'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
      qc.invalidateQueries({ queryKey: ['customer-transactions'] });
      qc.invalidateQueries({ queryKey: ['customer'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
