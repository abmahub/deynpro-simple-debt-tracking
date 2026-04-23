import { useState, useMemo, useRef } from 'react';
import { useSales } from '@/hooks/useSales';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FileText, Eye, Printer, Calendar, TrendingUp, Banknote, CreditCard, History } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

// Each sale = its own invoice. Generate a short readable invoice number.
function buildInvoiceNumber(sale: any, index: number, total: number) {
  const d = new Date(sale.date);
  const datePart = format(d, 'yyyyMMdd');
  // Sequential number based on reverse-sorted index (oldest = 1)
  const seq = String(total - index).padStart(4, '0');
  return `INV-${datePart}-${seq}`;
}

export default function Invoices() {
  const { data: sales } = useSales();
  const { data: shop } = useShopSettings();
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  // Consolidate sales: same customer + same day = 1 invoice
  const invoices = useMemo(() => {
    if (!sales) return [];
    return consolidateInvoices(sales);
  }, [sales]);

  // Group invoices by period
  const groupedInvoices = useMemo(() => {
    const groups: Record<string, any[]> = {};
    invoices.forEach((inv: any) => {
      const saleDate = new Date(inv.date);
      let key: string;
      if (period === 'daily') {
        key = format(saleDate, 'dd MMM yyyy');
      } else if (period === 'monthly') {
        key = format(saleDate, 'MMMM yyyy');
      } else {
        key = format(saleDate, 'yyyy');
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    });
    return groups;
  }, [invoices, period]);

  const groupKeys = Object.keys(groupedInvoices);

  // Summary stats
  const cashTotal = (sales || []).filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + s.total_amount, 0);
  const mpesaTotal = (sales || []).filter((s: any) => s.payment_method === 'mpesa').reduce((sum: number, s: any) => sum + s.total_amount, 0);
  const creditTotal = (sales || []).filter((s: any) => s.payment_method === 'credit').reduce((sum: number, s: any) => sum + s.total_amount, 0);

  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((s: number, inv: any) => s + inv.total_amount, 0);
  const todayInvoices = invoices.filter((inv: any) => isSameDay(new Date(inv.date), now));
  const todayRevenue = todayInvoices.reduce((s: number, inv: any) => s + inv.total_amount, 0);

  const paymentLabel = (method: string) => {
    const labels: Record<string, string> = { cash: '💵 Cash', mpesa: '📱 M-Pesa', card: '💳 Card', credit: '📝 On Debt' };
    return labels[method] || method;
  };

  const paymentBadgeStyle = (method: string) => {
    const styles: Record<string, string> = {
      cash: 'bg-success/10 text-success border-success/20',
      mpesa: 'bg-primary/10 text-primary border-primary/20',
      card: 'bg-accent/10 text-accent-foreground border-accent/20',
      credit: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return styles[method] || '';
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const shopName = shop?.shop_name || 'DeynPro';
    const shopPhone = shop?.phone || '';
    const shopAddress = shop?.address || '';
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 4px 0; color: #666; font-size: 14px; }
            .details { margin: 16px 0; font-size: 14px; }
            .details div { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; font-size: 14px; }
            th { background: #f5f5f5; font-weight: 600; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
            .footer { text-align: center; margin-top: 32px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <div class="footer">Thank you for your business! — ${shopName}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">Same-day sales per customer are combined</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Today</span>
              <Calendar size={14} className="text-primary" />
            </div>
            <p className="text-lg font-bold text-card-foreground">{todayInvoices.length} invoices</p>
            <p className="text-xs text-muted-foreground">{formatKES(todayRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Invoices</span>
              <FileText size={14} className="text-primary" />
            </div>
            <p className="text-lg font-bold text-card-foreground">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Grand Total (All Invoices)</span>
              <TrendingUp size={14} className="text-success" />
            </div>
            <p className="text-xl font-bold text-primary">{formatKES(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <Banknote size={18} className="mx-auto text-success mb-1" />
            <p className="text-xs text-muted-foreground">Cash Sales</p>
            <p className="text-sm font-bold text-card-foreground">{formatKES(cashTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <CreditCard size={18} className="mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">M-Pesa</p>
            <p className="text-sm font-bold text-card-foreground">{formatKES(mpesaTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 text-center">
            <History size={18} className="mx-auto text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">On Debt</p>
            <p className="text-sm font-bold text-card-foreground">{formatKES(creditTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Invoices */}
      {groupKeys.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center">
            <FileText size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No invoices yet. Make a sale to see invoices here.</p>
          </CardContent>
        </Card>
      ) : (
        groupKeys.map((key) => {
          const groupInvs = groupedInvoices[key];
          const groupTotal = groupInvs.reduce((s: number, inv: any) => s + inv.total_amount, 0);
          return (
            <Card key={key} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    {key}
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{groupInvs.length} invoice{groupInvs.length > 1 ? 's' : ''}</p>
                    <p className="text-sm font-bold text-primary">{formatKES(groupTotal)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupInvs.map((inv: any, idx: number) => (
                        <TableRow key={inv.id + idx}>
                          <TableCell className="text-sm">
                            {inv.customers?.name || <span className="text-muted-foreground">Walk-in</span>}
                            {inv.consolidated_sales.length > 1 && (
                              <span className="text-xs text-muted-foreground ml-1">({inv.consolidated_sales.length} sales)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {inv.all_items?.length || 0} item{(inv.all_items?.length || 0) !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={paymentBadgeStyle(inv.payment_method)}>
                              {paymentLabel(inv.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {formatKES(inv.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => setSelectedInvoice(inv)}>
                              <Eye size={14} /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} />
              Invoice — {selectedInvoice?.customers?.name || 'Walk-in'}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div ref={printRef}>
                <div className="header" style={{ textAlign: 'center', marginBottom: 16 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>{shop?.shop_name || 'DeynPro'}</h1>
                  {shop?.phone && <p style={{ margin: '2px 0', color: '#666', fontSize: 12 }}>📞 {shop.phone}</p>}
                  {shop?.address && <p style={{ margin: '2px 0', color: '#666', fontSize: 12 }}>📍 {shop.address}</p>}
                  <p style={{ margin: '4px 0', color: '#666', fontSize: 13 }}>Invoice</p>
                </div>

                <div className="details text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(selectedInvoice.date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{selectedInvoice.customers?.name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment:</span>
                    <span>{paymentLabel(selectedInvoice.payment_method)}</span>
                  </div>
                  {selectedInvoice.consolidated_sales.length > 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales combined:</span>
                      <span>{selectedInvoice.consolidated_sales.length}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid hsl(var(--border))' }}>
                      <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 12, color: '#888' }}>Product</th>
                      <th style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, color: '#888' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 12, color: '#888' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 12, color: '#888' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.all_items || []).map((item: any, i: number) => (
                      <tr key={item.id || i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td style={{ padding: '8px 0', fontSize: 13 }}>{item.products?.name || 'Unknown'}</td>
                        <td style={{ textAlign: 'center', padding: '8px 0', fontSize: 13 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '8px 0', fontSize: 13 }}>{formatKES(item.unit_price)}</td>
                        <td style={{ textAlign: 'right', padding: '8px 0', fontSize: 13, fontWeight: 600 }}>{formatKES(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <Separator className="my-2" />

                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-bold text-lg text-primary">{formatKES(selectedInvoice.total_amount)}</span>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handlePrint}>
                <Printer size={16} /> Print Invoice
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
