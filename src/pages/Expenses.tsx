import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExpenses, useAddExpense, useUpdateExpense, useDeleteExpense, EXPENSE_CATEGORIES } from '@/hooks/useExpenses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  rent: 'bg-accent/20 text-accent',
  utilities: 'bg-warning/20 text-warning',
  salaries: 'bg-primary/20 text-primary',
  supplies: 'bg-secondary text-secondary-foreground',
  transport: 'bg-info/20 text-info',
  other: 'bg-muted text-muted-foreground',
};

export default function Expenses() {
  const { t } = useTranslation();
  const { data: expenses, isLoading } = useExpenses();
  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  const resetForm = () => { setTitle(''); setAmount(''); setCategory('other'); setDescription(''); setDate(''); };

  const filtered = (expenses || []).filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) || e.category.includes(search.toLowerCase())
  );

  const totalExpenses = (expenses || []).reduce((s, e) => s + e.amount, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addExpense.mutateAsync({ title, amount: Number(amount), category, description: description || undefined, date: date || undefined });
      toast.success(t('expenses.added'));
      resetForm();
      setAddOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateExpense.mutateAsync({ id, title, amount: Number(amount), category, description: description || undefined });
      toast.success(t('expenses.updated'));
      setEditingId(null);
      resetForm();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('expenses.deleteConfirm'))) return;
    try { await deleteExpense.mutateAsync(id); toast.success(t('expenses.deleted')); } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (expense: any) => {
    setTitle(expense.title); setAmount(String(expense.amount)); setCategory(expense.category);
    setDescription(expense.description || ''); setEditingId(expense.id);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('expenses.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('expenses.totalLabel', { amount: totalExpenses.toLocaleString() })}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 gap-1"><Plus size={16} /> {t('common.add')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('expenses.addExpense')}</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <Input placeholder={t('expenses.titleField')} value={title} onChange={e => setTitle(e.target.value)} required />
              <Input placeholder={t('expenses.amountField')} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
              <div>
                <label className="text-xs text-muted-foreground">{t('common.date')}</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <Input placeholder={t('common.description')} value={description} onChange={e => setDescription(e.target.value)} />
              <Button type="submit" className="w-full gradient-primary border-0" disabled={addExpense.isPending}>
                {addExpense.isPending ? t('common.saving') : t('expenses.addExpense')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('expenses.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>}

      <div className="space-y-2">
        {filtered.map(expense => (
          <Card key={expense.id} className="shadow-card">
            <CardContent className="p-4">
              {editingId === expense.id ? (
                <form onSubmit={e => { e.preventDefault(); handleUpdate(expense.id); }} className="space-y-3">
                  <Input value={title} onChange={e => setTitle(e.target.value)} required />
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => { setEditingId(null); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
                    <Button type="submit" className="flex-1 gradient-primary border-0" disabled={updateExpense.isPending}>{t('common.update')}</Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-muted-foreground" />
                      <p className="font-medium text-card-foreground">{expense.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-destructive">-KES {expense.amount.toLocaleString()}</span>
                      <Badge className={`text-xs ${categoryColors[expense.category] || categoryColors.other}`}>{expense.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
                    {expense.description && <p className="text-xs text-muted-foreground">{expense.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(expense)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(expense.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {search ? t('expenses.noResults') : t('expenses.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
