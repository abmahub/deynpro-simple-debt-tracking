import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCustomers, useAddCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, ChevronRight, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/excelExport';

export default function Customers() {
  const { t } = useTranslation();
  const { data: customers, isLoading } = useCustomers();
  const addCustomer = useAddCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  ) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCustomer.mutateAsync({ id: editingId, name, phone });
        toast.success(t('customers.updated'));
      } else {
        await addCustomer.mutateAsync({ name, phone });
        toast.success(t('customers.added'));
      }
      setName(''); setPhone(''); setDialogOpen(false); setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (e: React.MouseEvent, customer: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, customerName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('customers.deleteConfirm', { name: customerName }))) return;
    try {
      await deleteCustomer.mutateAsync(id);
      toast.success(t('customers.deleted'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('customers.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('customers.total', { count: customers?.length || 0 })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" onClick={() => {
            const rows = (customers || []).map(c => ({
              [t('common.name')]: c.name,
              [t('common.phone')]: c.phone,
              [t('common.date')]: c.created_at,
            }));
            exportToExcel('DeynPro_Customers', [{ name: t('customers.title'), rows }]);
            toast.success(t('common.excelDownloaded'));
          }}>
            <FileSpreadsheet size={16} /> {t('common.excel')}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingId(null); setName(''); setPhone(''); }
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary border-0 gap-1">
                <Plus size={16} /> {t('common.add')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? t('customers.editCustomer') : t('customers.addCustomer')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <Input placeholder={t('customers.customerName')} value={name} onChange={e => setName(e.target.value)} required />
                <Input placeholder={t('customers.phonePlaceholder')} value={phone} onChange={e => setPhone(e.target.value)} required />
                <Button type="submit" className="w-full gradient-primary border-0" disabled={addCustomer.isPending || updateCustomer.isPending}>
                  {editingId ? t('common.update') : t('customers.addCustomer')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(customer => (
          <Link key={customer.id} to={`/customers/${customer.id}`}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-card-foreground">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEdit(e, customer)}>
                    <Pencil size={14} className="text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleDelete(e, customer.id, customer.name)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                  <ChevronRight size={18} className="text-muted-foreground rtl:rotate-180" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {search ? t('customers.noResults') : t('customers.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
