import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbInsert, dbUpdate, dbDelete } from '@/lib/data';

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  address: string | null;
  created_at: string;
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      return await dbSelect<Supplier>('suppliers', { orderBy: { column: 'name' } });
    },
  });
}

export function useAddSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: { name: string; phone?: string; description?: string; address?: string }) => {
      return await dbInsert<Supplier>('suppliers', supplier as any);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; phone?: string; description?: string; address?: string }) => {
      await dbUpdate('suppliers', id, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dbDelete('suppliers', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
