import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer, useCustomerTransactions, useCustomerBalance, useAddTransaction } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, Phone, MessageCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { toast } from 'sonner';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

function formatPhone(phone: string) {
  let clean = phone.replace(/\s+/g, '');
  if (clean.startsWith('0')) clean = '254' + clean.slice(1);
  if (!clean.startsWith('+')) clean = '+' + clean;
  return clean.replace('+', '');
}

function openWhatsApp(phone: string, message: string) {
  const num = formatPhone(phone);
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
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
  const [dueDate, setDueDate] = useState('');
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
        due_date: txType === 'debt' && dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      toast.success(txType === 'debt' ? 'Debt added' : 'Payment recorded');
      setAmount(''); setDescription(''); setDueDate(''); setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendReminder = (tx: any) => {
    if (!customer) return;
    const msg = `Habari ${customer.name},\n\nHii ni ukumbusho kwamba una deni la ${formatKES(tx.amount)}${tx.due_date ? ` ambalo lilipaswa kulipwa tarehe ${format(new Date(tx.due_date), 'MMM d, yyyy')}` : ''}.\n\nTafadhali lipa haraka iwezekanavyo.\n\nAsante! 🙏`;
    openWhatsApp(customer.phone, msg);
  };

  const handleWhatsApp = () => {
    if (!customer) return;
    const msg = balance.balance > 0
      ? `Habari ${customer.name}, una deni la jumla ${formatKES(balance.balance)}. Tafadhali lipa haraka. Asante!`
      : `Habari ${customer.name}! Asante kwa biashara yako. 🙏`;
    openWhatsApp(customer.phone, msg);
  };

  // Find overdue debts
  const overdueDebts = transactions?.filter(
    tx => tx.type === 'debt' && tx.due_date && isPast(parseISO(tx.due_date))
  ) || [];

  if (custLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-32 bg-muted rounded-xl" /></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{customer?.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone size={12} /> {customer?.phone}</p>
        </div>
        <Button
          size="sm"
          className="gap-1 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white border-0"
          onClick={handleWhatsApp}
        >
          <MessageCircle size={16} /> WhatsApp
        </Button>
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

      {/* Overdue alert */}
      {overdueDebts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-destructive" />
              <p className="text-sm font-semibold text-destructive">{overdueDebts.length} Overdue Debt{overdueDebts.length > 1 ? 's' : ''}</p>
            </div>
            {overdueDebts.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-card-foreground">{formatKES(tx.amount)}</p>
                  <p className="text-xs text-muted-foreground">Due: {format(new Date(tx.due_date!), 'MMM d, yyyy')}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1 text-xs border-[hsl(142,70%,45%)] text-[hsl(142,70%,45%)]" onClick={() => handleSendReminder(tx)}>
                  <MessageCircle size={14} /> Remind
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
              {txType === 'debt' && (
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock size={14} /> Payment due date (optional)
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
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
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), 'MMM d, yyyy')}
                  {tx.type === 'debt' && tx.due_date && (
                    <span className={isPast(parseISO(tx.due_date)) ? ' text-destructive' : ''}>
                      {' '}· Due: {format(new Date(tx.due_date), 'MMM d')}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tx.type === 'debt' && tx.due_date && isPast(parseISO(tx.due_date)) && (
                  <button onClick={() => handleSendReminder(tx)} className="text-[hsl(142,70%,45%)]">
                    <MessageCircle size={16} />
                  </button>
                )}
                <span className={`text-sm font-semibold ${tx.type === 'payment' ? 'text-success' : 'text-destructive'}`}>
                  {tx.type === 'payment' ? '-' : '+'}{formatKES(tx.amount)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
