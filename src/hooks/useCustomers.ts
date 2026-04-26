import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbSelect, dbSelectOne, dbInsert, dbUpdate, dbDelete, attachOne } from '@/lib/data';

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
      return await dbSelect<Customer>('customers', {
        orderBy: { column: 'created_at', ascending: false },
      });
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const c = await dbSelectOne<Customer>('customers', { id });
      if (!c) throw new Error('Customer not found');
      return c;
    },
  });
}

export function useCustomerTransactions(customerId: string) {
  return useQuery({
    queryKey: ['transactions', customerId],
    queryFn: async () => {
      return await dbSelect<Transaction>('transactions', {
        filters: { customer_id: customerId },
        orderBy: { column: 'date', ascending: false },
      });
    },
  });
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const txs = await dbSelect<Transaction>('transactions', {
        orderBy: { column: 'date', ascending: false },
      });
      return await attachOne(txs, 'customer_id', 'customers', 'customers', ['name', 'phone']) as
        (Transaction & { customers: { name: string; phone: string } })[];
    },
  });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      return await dbInsert<Customer>('customers', { name, phone });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, phone }: { id: string; name: string; phone: string }) => {
      await dbUpdate('customers', id, { name, phone });
      return { id, name, phone };
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
      await dbDelete('customers', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dbDelete('transactions', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, description, due_date }: { id: string; amount: number; description?: string; due_date?: string }) => {
      await dbUpdate('transactions', id, {
        amount,
        description: description || null,
        due_date: due_date || null,
      });
      return { id, amount, description, due_date };
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
      // Note: transactions don't have user_id (they're scoped by customer).
      // dbInsert adds user_id by default — strip it after the fact for the
      // online path. The Electron schema accepts the extra field harmlessly.
      return await dbInsert<Transaction>('transactions', {
        customer_id: tx.customer_id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description || null,
        date: new Date().toISOString(),
        due_date: tx.due_date || null,
      } as any);
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
      const custs = await dbSelect<Customer>('customers');
      const txs = await dbSelect<Transaction>('transactions');

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
