import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbInsert, dbDelete } from '@/lib/data';

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense_categories'],
    queryFn: async () => {
      return await dbSelect<ExpenseCategory>('expense_categories', { orderBy: { column: 'name' } });
    },
  });
}

export function useAddExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      return await dbInsert<ExpenseCategory>('expense_categories', {
        name: input.name.trim().toLowerCase(),
        color: input.color || 'muted',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense_categories'] }),
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dbDelete('expense_categories', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense_categories'] }),
  });
}