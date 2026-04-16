import { useState } from 'react';
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CATEGORIES = ['Electronics', 'Food', 'Clothing', 'Hardware', 'Beauty', 'Stationery', 'Other'];

function ProductForm({ product, suppliers, onSubmit, isPending, onCancel }: {
  product?: any;
  suppliers: any[];
  onSubmit: (data: any) => void;
  isPending: boolean;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price || '',
    cost_price: product?.cost_price || '',
    quantity: product?.quantity ?? '',
    category: product?.category || '',
    description: product?.description || '',
    barcode: product?.barcode || '',
    expiry_date: product?.expiry_date || '',
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    supplier_id: product?.supplier_id || '',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      price: Number(form.price),
      cost_price: Number(form.cost_price),
      quantity: Number(form.quantity),
      category: form.category || null,
      description: form.description || null,
      barcode: form.barcode || null,
      expiry_date: form.expiry_date || null,
      low_stock_threshold: Number(form.low_stock_threshold),
      supplier_id: form.supplier_id || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <Input placeholder="Product name *" value={form.name} onChange={e => update('name', e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Selling price *" type="number" min="0" step="0.01" value={form.price} onChange={e => update('price', e.target.value)} required />
        <Input placeholder="Cost price *" type="number" min="0" step="0.01" value={form.cost_price} onChange={e => update('cost_price', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Quantity *" type="number" min="0" value={form.quantity} onChange={e => update('quantity', e.target.value)} required />
        <Input placeholder="Low stock alert at" type="number" min="0" value={form.low_stock_threshold} onChange={e => update('low_stock_threshold', e.target.value)} />
      </div>
      <Select value={form.category} onValueChange={v => update('category', v)}>
        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={form.supplier_id} onValueChange={v => update('supplier_id', v)}>
        <SelectTrigger><SelectValue placeholder="Supplier (optional)" /></SelectTrigger>
        <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input placeholder="Barcode" value={form.barcode} onChange={e => update('barcode', e.target.value)} />
      <div>
        <label className="text-xs text-muted-foreground">Expiry Date</label>
        <Input type="date" value={form.expiry_date} onChange={e => update('expiry_date', e.target.value)} />
      </div>
      <Input placeholder="Description" value={form.description} onChange={e => update('description', e.target.value)} />
      <div className="flex gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>}
        <Button type="submit" className="flex-1 gradient-primary border-0" disabled={isPending}>
          {isPending ? 'Saving...' : product ? 'Update' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}

function StockBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  if (quantity === 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (quantity <= threshold) return <Badge className="bg-warning/20 text-warning border-warning/30">Low stock</Badge>;
  return <Badge variant="secondary">{quantity} in stock</Badge>;
}

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: suppliers } = useSuppliers();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = (products || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = async (data: any) => {
    try {
      await addProduct.mutateAsync(data);
      toast.success('Product added!');
      setAddOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await updateProduct.mutateAsync({ id, ...data });
      toast.success('Product updated!');
      setEditingId(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Product deleted');
    } catch (err: any) {
      if (err.message?.includes('foreign key constraint') || err.message?.includes('sale_items')) {
        toast.error('Cannot delete this product — it has sales history. You can edit it instead.');
      } else {
        toast.error(err.message);
      }
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">{products?.length || 0} total</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary border-0 gap-1"><Plus size={16} /> Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
            <ProductForm suppliers={suppliers || []} onSubmit={handleAdd} isPending={addProduct.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>}

      <div className="space-y-2">
        {filtered.map(product => (
          <Card key={product.id} className="shadow-card">
            <CardContent className="p-4">
              {editingId === product.id ? (
                <ProductForm
                  product={product}
                  suppliers={suppliers || []}
                  onSubmit={(data) => handleUpdate(product.id, data)}
                  isPending={updateProduct.isPending}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-primary" />
                      <p className="font-medium text-card-foreground">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-primary">KES {product.price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">Cost: KES {product.cost_price.toLocaleString()}</span>
                      <StockBadge quantity={product.quantity} threshold={product.low_stock_threshold} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {product.category && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{product.category}</span>}
                      {product.suppliers?.name && <span className="text-xs text-muted-foreground">Supplier: {product.suppliers.name}</span>}
                      {product.expiry_date && (
                        <span className={`text-xs ${new Date(product.expiry_date) < new Date() ? 'text-destructive' : 'text-muted-foreground'}`}>
                          Exp: {product.expiry_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(product.id)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {search || categoryFilter !== 'all' ? 'No products found' : 'No products yet. Add your first one!'}
          </p>
        )}
      </div>
    </div>
  );
}
