import { useEffect, useState } from 'react';
import { useShopSettings, useSaveShopSettings } from '@/hooks/useShopSettings';
import { useExpenseCategories, useAddExpenseCategory, useDeleteExpenseCategory } from '@/hooks/useExpenseCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Tag, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { data: settings, isLoading } = useShopSettings();
  const save = useSaveShopSettings();
  const { data: categories } = useExpenseCategories();
  const addCat = useAddExpenseCategory();
  const delCat = useDeleteExpenseCategory();

  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (settings) {
      setShopName(settings.shop_name || '');
      setPhone(settings.phone || '');
      setAddress(settings.address || '');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ shop_name: shopName, phone: phone || undefined, address: address || undefined });
      toast.success('Shop settings saved');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await addCat.mutateAsync({ name: newCat });
      setNewCat('');
      toast.success('Category added');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your shop and expense categories</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store size={18} className="text-primary" /> Shop Information
          </CardTitle>
          <p className="text-xs text-muted-foreground">Shown on invoices and receipts</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="shopName">Shop Name *</Label>
              <Input id="shopName" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. Hakima General Store" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +254 712 345 678" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Nairobi CBD, Tom Mboya St" />
            </div>
            <Button type="submit" className="gradient-primary border-0" disabled={save.isPending || isLoading}>
              {save.isPending ? 'Saving...' : 'Save Shop Info'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag size={18} className="text-primary" /> Expense Categories
          </CardTitle>
          <p className="text-xs text-muted-foreground">Create your own categories used in the Expenses page</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddCat} className="flex gap-2">
            <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category (e.g. marketing)" />
            <Button type="submit" className="gap-1 gradient-primary border-0" disabled={addCat.isPending}>
              <Plus size={14} /> Add
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {(categories || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No custom categories yet. Add one above.</p>
            )}
            {(categories || []).map(c => (
              <Badge key={c.id} variant="secondary" className="gap-1 capitalize py-1.5 px-3">
                {c.name}
                <button
                  onClick={() => delCat.mutate(c.id)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}