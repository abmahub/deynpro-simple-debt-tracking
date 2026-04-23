import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface UserWithRole {
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
  id: string;
  email?: string;
  blocked?: boolean;
}

export function useAllUserRoles() {
  return useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      // Get roles
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get user emails from edge function
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });
      
      const users = res.data?.users || [];
      const emailMap: Record<string, string> = {};
      users.forEach((u: any) => { emailMap[u.id] = u.email; });

      return (roles || []).map(r => ({ ...r, email: emailMap[r.user_id] || 'Unknown' })) as UserWithRole[];
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
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: 'admin' | 'user' }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create', email, password, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useSetUserBlocked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'set_blocked', userId, blocked },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
    },
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
