import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface UserWithRole {
  user_id: string;
  role: 'admin' | 'customer';
  created_at: string;
  id: string;
}

export function useAllUserRoles() {
  return useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserWithRole[];
    },
  });
}

export function useAllCustomersAdmin() {
  return useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*, transactions(id, type, amount)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllTransactionsAdmin() {
  return useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(name, phone, user_id)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'customer' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user-roles'] }),
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [{ data: roles }, { data: customers }, { data: transactions }] = await Promise.all([
        supabase.from('user_roles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('transactions').select('*'),
      ]);

      const totalUsers = roles?.length || 0;
      const adminCount = roles?.filter(r => r.role === 'admin').length || 0;
      const customerCount = customers?.length || 0;
      const txs = transactions || [];
      const totalDebt = txs.filter(t => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
      const totalPayments = txs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
      const totalTransactions = txs.length;

      return {
        totalUsers,
        adminCount,
        customerRoleCount: totalUsers - adminCount,
        customerCount,
        totalDebt,
        totalPayments,
        outstandingDebt: totalDebt - totalPayments,
        totalTransactions,
      };
    },
  });
}
