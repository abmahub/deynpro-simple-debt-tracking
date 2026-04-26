import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbInsert, dbUpdate, dbDelete } from '@/lib/data';

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  supplier_id: string | null;
  created_at: string;
}

export const EXPENSE_CATEGORIES = ['rent', 'utilities', 'salaries', 'supplies', 'transport', 'other'] as const;

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      return await dbSelect<Expense>('expenses', { orderBy: { column: 'date', ascending: false } });
    },
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: { title: string; amount: number; category: string; description?: string; date?: string; supplier_id?: string | null }) => {
      return await dbInsert<Expense>('expenses', expense as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      await dbUpdate('expenses', id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dbDelete('expenses', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
