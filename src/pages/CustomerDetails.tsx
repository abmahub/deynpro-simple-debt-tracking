import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer, useCustomerTransactions, useCustomerBalance, useAddTransaction } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading: custLoading } = useCustomer(id!);
  const { data: transactions, isLoading: txLoading } = useCustomerTransactions(id!);
  const balance = useCustomerBalance(id!);
  const addTransaction = useAddTransaction();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [txType, setTxType] = useState<'debt' | 'payment'>('debt');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await addTransaction.mutateAsync({
        customer_id: id!,
        type: txType,
        amount: numAmount,
        description: description || undefined,
      });
      toast.success(txType === 'debt' ? 'Debt added' : 'Payment recorded');
      setAmount(''); setDescription(''); setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (custLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-32 bg-muted rounded-xl" /></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{customer?.name}</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone size={12} /> {customer?.phone}</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Debt</p>
            <p className="text-lg font-bold text-destructive">{formatKES(balance.totalDebt)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-bold text-success">{formatKES(balance.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`text-lg font-bold ${balance.balance > 0 ? 'text-destructive' : 'text-success'}`}>
              {formatKES(balance.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 gradient-primary border-0 gap-1" onClick={() => setTxType('debt')}>
              <Plus size={16} /> Add Debt
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 gap-1 border-primary text-primary" onClick={() => setTxType('payment')}>
              <Minus size={16} /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{txType === 'debt' ? 'Add Debt' : 'Record Payment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTx} className="space-y-4">
              <Input
                type="number"
                placeholder="Amount (KES)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                min="1"
              />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <Button type="submit" className="w-full gradient-primary border-0" disabled={addTransaction.isPending}>
                {addTransaction.isPending ? 'Saving...' : txType === 'debt' ? 'Add Debt' : 'Record Payment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction History */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {txLoading && <div className="h-20 bg-muted rounded animate-pulse" />}
          {!txLoading && (transactions?.length || 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          )}
          {transactions?.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-card-foreground capitalize">{tx.description || tx.type}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(tx.date), 'MMM d, yyyy')}</p>
              </div>
              <span className={`text-sm font-semibold ${tx.type === 'payment' ? 'text-success' : 'text-destructive'}`}>
                {tx.type === 'payment' ? '-' : '+'}{formatKES(tx.amount)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
