import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  user_id: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  type: 'debt' | 'payment';
  amount: number;
  date: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

export function useCustomerTransactions(customerId: string) {
  return useQuery({
    queryKey: ['transactions', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(name, phone)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as (Transaction & { customers: { name: string; phone: string } })[];
    },
  });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('customers').insert({ name, phone, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, phone }: { id: string; name: string; phone: string }) => {
      const { data, error } = await supabase.from('customers').update({ name, phone }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', vars.id] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: { customer_id: string; type: 'debt' | 'payment'; amount: number; description?: string; due_date?: string }) => {
      const { data, error } = await supabase.from('transactions').insert({
        ...tx,
        date: new Date().toISOString(),
        due_date: tx.due_date || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions', vars.customer_id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCustomerBalance(customerId: string) {
  const { data: transactions } = useCustomerTransactions(customerId);
  if (!transactions) return { totalDebt: 0, totalPaid: 0, balance: 0 };
  const totalDebt = transactions.filter(t => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
  const totalPaid = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  return { totalDebt, totalPaid, balance: totalDebt - totalPaid };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data: customers } = await supabase.from('customers').select('id, name, phone');
      const { data: transactions } = await supabase.from('transactions').select('*');

      const txs = transactions || [];
      const custs = customers || [];

      const totalDebt = txs.filter(t => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
      const totalPayments = txs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

      // Per-customer balance
      const balances: Record<string, number> = {};
      txs.forEach(t => {
        if (!balances[t.customer_id]) balances[t.customer_id] = 0;
        balances[t.customer_id] += t.type === 'debt' ? t.amount : -t.amount;
      });

      const overdueCustomers = custs
        .filter(c => (balances[c.id] || 0) > 0)
        .map(c => ({ ...c, balance: balances[c.id] }));

      // Monthly payments for chart
      const monthlyPayments: Record<string, number> = {};
      txs.filter(t => t.type === 'payment').forEach(t => {
        const month = new Date(t.date).toLocaleString('en', { month: 'short', year: '2-digit' });
        monthlyPayments[month] = (monthlyPayments[month] || 0) + t.amount;
      });

      const chartData = Object.entries(monthlyPayments)
        .slice(-6)
        .map(([month, amount]) => ({ month, amount }));

      const recentTxs = txs.slice(0, 5);

      return {
        totalDebt: totalDebt - totalPayments,
        totalPayments,
        customerCount: custs.length,
        overdueCount: overdueCustomers.length,
        overdueCustomers: overdueCustomers.slice(0, 5),
        chartData,
        recentTransactions: recentTxs,
      };
    },
  });
}
