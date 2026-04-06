import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomers, useAddCustomer } from '@/hooks/useCustomers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
  const { data: customers, isLoading } = useCustomers();
  const addCustomer = useAddCustomer();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  ) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCustomer.mutateAsync({ name, phone });
      toast.success('Customer added!');
      setName(''); setPhone(''); setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers?.length || 0} total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 gap-1">
              <Plus size={16} /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input placeholder="Customer name" value={name} onChange={e => setName(e.target.value)} required />
              <Input placeholder="Phone (e.g. 0712345678)" value={phone} onChange={e => setPhone(e.target.value)} required />
              <Button type="submit" className="w-full gradient-primary border-0" disabled={addCustomer.isPending}>
                {addCustomer.isPending ? 'Adding...' : 'Add Customer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
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
                <ChevronRight size={18} className="text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {search ? 'No customers found' : 'No customers yet. Add your first one!'}
          </p>
        )}
      </div>
    </div>
  );
}
