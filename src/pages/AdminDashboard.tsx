import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, ArrowLeftRight, TrendingDown, TrendingUp, Crown, UserCheck } from 'lucide-react';
import { useAdminStats, useAllUserRoles, useUpdateRole, useAllCustomersAdmin, useAllTransactionsAdmin } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { toast } from 'sonner';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: userRoles, isLoading: rolesLoading } = useAllUserRoles();
  const { data: customers, isLoading: custsLoading } = useAllCustomersAdmin();
  const { data: transactions, isLoading: txLoading } = useAllTransactionsAdmin();
  const updateRole = useUpdateRole();

  const handleRoleChange = async (userId: string, role: 'admin' | 'customer') => {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success(`Role updated to ${role}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-accent' },
    { label: 'Admins', value: stats?.adminCount || 0, icon: Crown, color: 'text-warning' },
    { label: 'Outstanding Debt', value: formatKES(stats?.outstandingDebt || 0), icon: TrendingDown, color: 'text-destructive' },
    { label: 'Total Payments', value: formatKES(stats?.totalPayments || 0), icon: TrendingUp, color: 'text-success' },
    { label: 'Customers', value: stats?.customerCount || 0, icon: UserCheck, color: 'text-primary' },
    { label: 'Transactions', value: stats?.totalTransactions || 0, icon: ArrowLeftRight, color: 'text-info' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-2">
        <Shield size={24} className="text-warning" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Full system control</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map(card => (
          <Card key={card.label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <card.icon size={16} className={card.color} />
              </div>
              <p className="text-xl font-bold text-card-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="customers">All Customers</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-2 mt-4">
          {rolesLoading && <div className="h-20 bg-muted rounded-xl animate-pulse" />}
          {userRoles?.map(ur => (
            <Card key={ur.id} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-card-foreground truncate">{ur.user_id}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(ur.created_at), 'MMM d, yyyy')}</p>
                </div>
                <Select
                  value={ur.role}
                  onValueChange={(val) => handleRoleChange(ur.user_id, val as 'admin' | 'customer')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
          {!rolesLoading && (userRoles?.length || 0) === 0 && (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-2 mt-4">
          {custsLoading && <div className="h-20 bg-muted rounded-xl animate-pulse" />}
          {customers?.map((c: any) => {
            const debt = c.transactions?.filter((t: any) => t.type === 'debt').reduce((s: number, t: any) => s + t.amount, 0) || 0;
            const paid = c.transactions?.filter((t: any) => t.type === 'payment').reduce((s: number, t: any) => s + t.amount, 0) || 0;
            const balance = debt - paid;
            return (
              <Card key={c.id} className="shadow-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={balance > 0 ? 'destructive' : 'secondary'} className="text-xs">
                      {balance > 0 ? `Owes ${formatKES(balance)}` : 'Clear'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{c.transactions?.length || 0} txns</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!custsLoading && (customers?.length || 0) === 0 && (
            <p className="text-center text-muted-foreground py-8">No customers found</p>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-2 mt-4">
          {txLoading && <div className="h-20 bg-muted rounded-xl animate-pulse" />}
          {transactions?.map((tx: any) => (
            <Card key={tx.id} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{tx.customers?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tx.description || tx.type} · {format(new Date(tx.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'payment' ? 'text-success' : 'text-destructive'}`}>
                  {tx.type === 'payment' ? '-' : '+'}{formatKES(tx.amount)}
                </span>
              </CardContent>
            </Card>
          ))}
          {!txLoading && (transactions?.length || 0) === 0 && (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
