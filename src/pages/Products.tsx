import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/excelExport';

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
  const { t } = useTranslation();
  if (quantity === 0) return <Badge variant="destructive">{t('products.outOfStock')}</Badge>;
  if (quantity <= threshold) return <Badge className="bg-warning/20 text-warning border-warning/30">{t('products.lowStock')}</Badge>;
  return <Badge variant="secondary">{t('products.inStock', { count: quantity })}</Badge>;
}

export default function Products() {
  const { t } = useTranslation();
  const { data: products, isLoading } = useProducts();
  const { data: suppliers } = useSuppliers();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', cost_price: '', quantity: '', category: '',
    barcode: '', expiry_date: '', low_stock_threshold: '5', supplier_id: '', description: '',
  });

  const searchRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const filtered = (products || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const firstRow = tableRef.current?.querySelector('tbody tr') as HTMLElement;
      firstRow?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      filterRef.current?.focus();
    }
  };

  const handleInlineAdd = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.cost_price) {
      toast.error(t('products.requiredFields'));
      return;
    }
    try {
      await addProduct.mutateAsync({
        name: newProduct.name,
        price: Number(newProduct.price),
        cost_price: Number(newProduct.cost_price),
        quantity: Number(newProduct.quantity) || 0,
        category: newProduct.category || null,
        barcode: newProduct.barcode || null,
        expiry_date: newProduct.expiry_date || null,
        low_stock_threshold: Number(newProduct.low_stock_threshold) || 5,
        supplier_id: newProduct.supplier_id || null,
        description: newProduct.description || null,
        image_url: null,
      });
      toast.success(t('products.added'));
      setNewProduct({ name: '', price: '', cost_price: '', quantity: '', category: '', barcode: '', expiry_date: '', low_stock_threshold: '5', supplier_id: '', description: '' });
      setIsAdding(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await updateProduct.mutateAsync({ id, ...data });
      toast.success(t('products.updated'));
      setEditingId(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('products.deleteConfirm'))) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success(t('products.deleted'));
    } catch (err: any) {
      if (err.message?.includes('foreign key constraint') || err.message?.includes('sale_items')) {
        toast.error(t('products.cantDelete'));
      } else {
        toast.error(err.message);
      }
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const rows = tableRef.current?.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
      rows?.[index + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) searchRef.current?.focus();
      else {
        const rows = tableRef.current?.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
        rows?.[index - 1]?.focus();
      }
    }
  };

  const updateNew = (field: string, value: string) => setNewProduct(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('products.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('customers.total', { count: products?.length || 0 })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" onClick={() => {
            const rows = (products || []).map(p => ({
              [t('common.name')]: p.name,
              [t('common.category')]: p.category || '',
              [t('products.sellingPrice')]: p.price,
              [t('products.costPrice')]: p.cost_price,
              [t('common.quantity')]: p.quantity,
              [t('products.lowStockAt')]: p.low_stock_threshold,
              [t('products.barcode')]: p.barcode || '',
              [t('products.expiry')]: p.expiry_date || '',
              [t('nav.suppliers')]: p.suppliers?.name || '',
              [t('common.description')]: p.description || '',
            }));
            exportToExcel('DeynPro_Products', [{ name: t('products.title'), rows }]);
            toast.success(t('common.excelDownloaded'));
          }}>
            <FileSpreadsheet size={16} /> {t('common.excel')}
          </Button>
          <Button className="gradient-primary border-0 gap-1" onClick={() => setIsAdding(true)}>
            <Plus size={16} /> {t('common.add')}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder={t('products.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger ref={filterRef} className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('sales.allCategories')}</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>}

      {!isLoading && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="border-r border-border w-16">#</TableHead>
                <TableHead className="border-r border-border">{t('common.name')}</TableHead>
                <TableHead className="border-r border-border">{t('common.category')}</TableHead>
                <TableHead className="border-r border-border text-right">{t('products.selling')}</TableHead>
                <TableHead className="border-r border-border text-right">{t('products.buying')}</TableHead>
                <TableHead className="border-r border-border text-center">{t('products.qty')}</TableHead>
                <TableHead className="border-r border-border">{t('products.expiry')}</TableHead>
                <TableHead className="border-r border-border">{t('common.status')}</TableHead>
                <TableHead className="w-24 text-center">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow className="border-b border-border bg-primary/5">
                  <TableCell className="border-r border-border text-muted-foreground font-mono text-xs">NEW</TableCell>
                  <TableCell className="border-r border-border p-1">
                    <Input placeholder={t('products.nameRequired')} value={newProduct.name} onChange={e => updateNew('name', e.target.value)} className="h-8 text-sm" autoFocus />
                  </TableCell>
                  <TableCell className="border-r border-border p-1">
                    <Select value={newProduct.category} onValueChange={v => updateNew('category', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="border-r border-border p-1">
                    <Input placeholder="0" type="number" min="0" step="0.01" value={newProduct.price} onChange={e => updateNew('price', e.target.value)}
                      className="h-8 text-sm text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" />
                  </TableCell>
                  <TableCell className="border-r border-border p-1">
                    <Input placeholder="0" type="number" min="0" step="0.01" value={newProduct.cost_price} onChange={e => updateNew('cost_price', e.target.value)}
                      className="h-8 text-sm text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" />
                  </TableCell>
                  <TableCell className="border-r border-border p-1">
                    <Input placeholder="0" type="number" min="0" value={newProduct.quantity} onChange={e => updateNew('quantity', e.target.value)}
                      className="h-8 text-sm text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" />
                  </TableCell>
                  <TableCell className="border-r border-border p-1">
                    <Input type="date" value={newProduct.expiry_date} onChange={e => updateNew('expiry_date', e.target.value)} className="h-8 text-sm" />
                  </TableCell>
                  <TableCell className="border-r border-border text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-center p-1">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" className="h-7 text-xs gradient-primary border-0" onClick={handleInlineAdd} disabled={addProduct.isPending}>
                        {addProduct.isPending ? '...' : t('common.save')}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>✕</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((product, index) => (
                <TableRow
                  key={product.id}
                  tabIndex={0}
                  onKeyDown={(e) => handleRowKeyDown(e, index + (isAdding ? 1 : 0))}
                  className="border-b border-border focus:bg-primary/5 focus:outline-none"
                >
                  {editingId === product.id ? (
                    <TableCell colSpan={9} className="p-4">
                      <ProductForm
                        product={product}
                        suppliers={suppliers || []}
                        onSubmit={(data) => handleUpdate(product.id, data)}
                        isPending={updateProduct.isPending}
                        onCancel={() => setEditingId(null)}
                      />
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="border-r border-border font-mono text-muted-foreground text-xs">
                        #{String(index + 1).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="border-r border-border font-medium text-card-foreground">
                        {product.name}
                      </TableCell>
                      <TableCell className="border-r border-border text-sm text-muted-foreground">
                        {product.category || '—'}
                      </TableCell>
                      <TableCell className="border-r border-border text-right font-semibold text-primary">
                        {product.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="border-r border-border text-right text-sm text-muted-foreground">
                        {product.cost_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="border-r border-border text-center">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="border-r border-border text-sm text-muted-foreground">
                        {product.expiry_date || '—'}
                      </TableCell>
                      <TableCell className="border-r border-border">
                        <StockBadge quantity={product.quantity} threshold={product.low_stock_threshold} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(product.id)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(product.id)}><Trash2 size={14} /></Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && !isAdding && (
        <p className="text-center text-muted-foreground py-8">
          {search || categoryFilter !== 'all' ? 'No products found' : 'No products yet. Add your first one!'}
        </p>
      )}
    </div>
  );
}
