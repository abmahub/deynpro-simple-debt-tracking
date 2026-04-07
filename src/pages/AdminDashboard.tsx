import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Users, ArrowLeftRight, TrendingDown, TrendingUp, Crown, UserCheck, Plus, Trash2 } from 'lucide-react';
import { useAdminStats, useAllUserRoles, useUpdateRole, useCreateUser, useDeleteUser, useAllCustomersAdmin, useAllTransactionsAdmin } from '@/hooks/useAdmin';
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
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'customer'>('customer');

  const handleRoleChange = async (userId: string, role: 'admin' | 'customer') => {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success(`Role updated to ${role}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser.mutateAsync({ email: newEmail, password: newPassword, role: newRole });
      toast.success('User created successfully!');
      setNewEmail(''); setNewPassword(''); setNewRole('customer'); setAddDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser.mutateAsync(userId);
      toast.success('User deleted');
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
        <TabsContent value="users" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary border-0 gap-1">
                  <Plus size={16} /> Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'customer')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" className="w-full gradient-primary border-0" disabled={createUser.isPending}>
                    {createUser.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {rolesLoading && <div className="h-20 bg-muted rounded-xl animate-pulse" />}
          {userRoles?.map(ur => (
            <Card key={ur.id} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{ur.email || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(ur.created_at), 'MMM d, yyyy')}</p>
                </div>
                <Select
                  value={ur.role}
                  onValueChange={(val) => handleRoleChange(ur.user_id, val as 'admin' | 'customer')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0">
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete User?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete <strong>{ur.email}</strong> and all their data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteUser(ur.user_id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
