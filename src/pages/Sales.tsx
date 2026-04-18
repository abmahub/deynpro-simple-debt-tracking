import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateSale, CartItem, SaleItem } from '@/hooks/useSales';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, CheckCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function Sales() {
  const { t } = useTranslation();
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  
  const createSale = useCreateSale();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerId, setCustomerId] = useState('none');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set((products || []).map(p => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  // Filter products in modal
  const filteredProducts = useMemo(() => {
    setFocusedIndex(0);
    return (products || []).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(modalSearch.toLowerCase()) || (p.barcode || '').includes(modalSearch);
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, modalSearch, categoryFilter]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error(t('sales.notEnoughStock'));
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.quantity < 1) {
        toast.error(t('sales.outOfStock'));
        return prev;
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, available: product.quantity, cost_price: product.cost_price || 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return item;
      if (newQty > item.available) { toast.error(t('sales.notEnoughStock')); return item; }
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);

  // When payment method changes to credit, validate customer is selected
  const handlePaymentMethodChange = (value: string) => {
    if (value === 'credit' && customerId === 'none') {
      toast.error(t('sales.selectCustomerFirst'));
      return;
    }
    setPaymentMethod(value);
  };

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    if (value === 'none' && paymentMethod === 'credit') {
      setPaymentMethod('cash');
      toast.info(t('sales.paymentChangedToCash'));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error(t('sales.cartIsEmpty')); return; }
    const belowCost = cart.find(item => item.price < item.cost_price);
    if (belowCost) {
      toast.error(t('sales.belowCost', { name: belowCost.name, cost: belowCost.cost_price.toLocaleString() }));
      return;
    }
    if (paymentMethod === 'credit' && customerId === 'none') {
      toast.error(t('sales.creditRequiresCustomer'));
      return;
    }
    try {
      const items: SaleItem[] = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));
      await createSale.mutateAsync({
        items,
        payment_method: paymentMethod,
        customer_id: customerId !== 'none' ? customerId : undefined,
      });
      setCart([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast.success(t('sales.saleCompleted'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('sales.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('sales.subtitle')}</p>
      </div>


      {showSuccess && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="text-primary" size={24} />
            <div>
              <p className="font-medium text-primary">{t('sales.saleCompleted')}</p>
              <p className="text-sm text-muted-foreground">{t('sales.stockUpdated')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <Button className="w-full gap-2" variant="outline" onClick={() => setProductModalOpen(true)}>
          <Package size={16} /> {t('sales.addProducts')}
        </Button>

        <Card className="shadow-card">
          <CardContent className="p-0">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">{t('sales.cartEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="border border-border">
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="w-[90px] border-r border-border">{t('sales.itemNo')}</TableHead>
                      <TableHead className="border-r border-border">{t('sales.itemName')}</TableHead>
                      <TableHead className="text-right border-r border-border w-[130px]">{t('products.sellingPrice')}</TableHead>
                      <TableHead className="text-center border-r border-border w-[100px]">{t('common.quantity')}</TableHead>
                      <TableHead className="text-right border-r border-border">{t('common.total')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, index) => (
                      <TableRow key={item.product_id} className="border-b border-border">
                        <TableCell className="font-mono text-sm text-muted-foreground border-r border-border">
                          #{String(index + 1).padStart(6, '0')}
                        </TableCell>
                        <TableCell className="font-medium text-sm border-r border-border">{item.name}</TableCell>
                        <TableCell className="border-r border-border p-1">
                          <Input
                            type="number"
                            min={0}
                            className={`h-8 text-right text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${item.price < item.cost_price ? 'border-destructive text-destructive' : ''}`}
                            value={item.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const product = (products || []).find(p => p.id === item.product_id);
                              const costPrice = product?.cost_price || 0;
                              if (val < costPrice) {
                                toast.error(t('sales.priceCantBeBelowCost', { cost: costPrice.toLocaleString() }));
                              }
                              setCart(prev => prev.map(c => c.product_id === item.product_id ? { ...c, price: val } : c));
                            }}
                          />
                        </TableCell>
                        <TableCell className="border-r border-border p-1">
                          <Input
                            type="number"
                            min={1}
                            max={item.available}
                            className="h-8 text-center text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              if (val > item.available) { toast.error(t('sales.notEnoughStock')); return; }
                              setCart(prev => prev.map(c => c.product_id === item.product_id ? { ...c, quantity: Math.max(1, val) } : c));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm border-r border-border">{formatKES(item.price * item.quantity)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}>
                            <Trash2 size={12} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkout Section */}
        {cart.length > 0 && (
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-card-foreground">{t('sales.totalItems', { count: cart.length })}</span>
                <span className="text-xl font-bold text-primary">{formatKES(total)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('common.customer')}</label>
                  <Select value={customerId} onValueChange={handleCustomerChange}>
                    <SelectTrigger><SelectValue placeholder={t('sales.customerOptional')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('sales.walkIn')}</SelectItem>
                      {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('sales.paymentMethod')}</label>
                  <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('sales.cash')}</SelectItem>
                      <SelectItem value="mpesa">{t('sales.mpesa')}</SelectItem>
                      <SelectItem value="card">{t('sales.card')}</SelectItem>
                      {customerId !== 'none' && (
                        <SelectItem value="credit">{t('sales.credit')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {customerId === 'none' && (
                    <p className="text-xs text-muted-foreground mt-1">{t('sales.creditHint')}</p>
                  )}
                </div>
              </div>

              <Button className="w-full gradient-primary border-0" onClick={handleCheckout} disabled={createSale.isPending}>
                {createSale.isPending ? t('sales.processing') : `${t('sales.checkout')} — ${formatKES(total)}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Picker Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package size={18} /> {t('sales.selectProducts')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('sales.searchByNameBarcode')}
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="ps-9 h-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder={t('common.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sales.allCategories')}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product List */}
          <div
            className="flex-1 overflow-y-auto space-y-2 mt-2 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, 0));
              } else if (e.key === 'Enter' && filteredProducts[focusedIndex]) {
                e.preventDefault();
                addToCart(filteredProducts[focusedIndex]);
              }
            }}
            tabIndex={0}
          >
            {filteredProducts.map((product, idx) => {
              const inCart = cart.find(c => c.product_id === product.id);
              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${idx === focusedIndex ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  onClick={() => addToCart(product)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-semibold text-primary">{formatKES(product.price)}</span>
                      <span className={`text-xs ${product.quantity < 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {t('products.inStock', { count: product.quantity })}
                      </span>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inCart && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">{t('sales.inCart', { count: inCart.quantity })}</Badge>
                    )}
                    <Button size="icon" variant="ghost" className="text-primary h-8 w-8">
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{t('sales.noProductsFound')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
