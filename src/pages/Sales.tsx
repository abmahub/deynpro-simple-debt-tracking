import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateSale, CartItem, SaleItem } from '@/hooks/useSales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Minus, ShoppingCart, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Sales() {
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerId, setCustomerId] = useState('none');
  const [showSuccess, setShowSuccess] = useState(false);

  const availableProducts = (products || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
  );

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.quantity < 1) {
        toast.error('Out of stock');
        return prev;
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, available: product.quantity }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return item;
      if (newQty > item.available) { toast.error('Not enough stock'); return item; }
      return { ...item, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
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
      toast.success('Sale completed!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales / POS</h1>
        <p className="text-sm text-muted-foreground">Sell products and track payments</p>
      </div>

      {showSuccess && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="text-primary" size={24} />
            <div>
              <p className="font-medium text-primary">Sale completed!</p>
              <p className="text-sm text-muted-foreground">Stock has been updated automatically.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Product search */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {availableProducts.map(product => (
              <Card key={product.id} className="shadow-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => addToCart(product)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-card-foreground text-sm">{product.name}</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-semibold text-primary">KES {product.price.toLocaleString()}</span>
                      <span className={`text-xs ${product.quantity < 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {product.quantity} left
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-primary"><Plus size={18} /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart size={16} /> Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Click products to add them</p>
            )}
            {cart.map(item => (
              <div key={item.product_id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">KES {(item.price * item.quantity).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                    <Minus size={12} />
                  </Button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                    <Plus size={12} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-card-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">KES {total.toLocaleString()}</span>
                </div>

                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit">Credit (On Debt)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Customer (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Walk-in Customer</SelectItem>
                    {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Button className="w-full gradient-primary border-0" onClick={handleCheckout} disabled={createSale.isPending}>
                  {createSale.isPending ? 'Processing...' : `Checkout — KES ${total.toLocaleString()}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
