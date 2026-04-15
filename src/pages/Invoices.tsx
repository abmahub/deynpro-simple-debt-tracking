import { useState, useMemo, useRef } from 'react';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FileText, Eye, Printer, Calendar, TrendingUp } from 'lucide-react';
import { format, startOfDay, startOfMonth, startOfYear, isAfter, isSameDay, isSameMonth, isSameYear } from 'date-fns';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function Invoices() {
  const { data: sales } = useSales();
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  // Group sales by period
  const groupedSales = useMemo(() => {
    if (!sales) return {};
    const groups: Record<string, any[]> = {};

    sales.forEach((sale: any) => {
      const saleDate = new Date(sale.date);
      let key: string;
      if (period === 'daily') {
        key = format(saleDate, 'dd MMM yyyy');
      } else if (period === 'monthly') {
        key = format(saleDate, 'MMMM yyyy');
      } else {
        key = format(saleDate, 'yyyy');
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(sale);
    });

    return groups;
  }, [sales, period]);

  const groupKeys = Object.keys(groupedSales);

  // Summary stats
  const totalSales = sales?.length || 0;
  const totalRevenue = (sales || []).reduce((s: number, sale: any) => s + sale.total_amount, 0);
  const todaySales = (sales || []).filter((s: any) => isSameDay(new Date(s.date), now));
  const todayRevenue = todaySales.reduce((s: number, sale: any) => s + sale.total_amount, 0);

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
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${selectedSale?.id?.slice(0, 8)}</title>
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
          <div class="footer">Thank you for your business! — DeynPro</div>
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
          <p className="text-sm text-muted-foreground">View and print sale invoices</p>
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
              <span className="text-xs text-muted-foreground">Today's Sales</span>
              <Calendar size={14} className="text-primary" />
            </div>
            <p className="text-lg font-bold text-card-foreground">{todaySales.length}</p>
            <p className="text-xs text-muted-foreground">{formatKES(todayRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Invoices</span>
              <FileText size={14} className="text-primary" />
            </div>
            <p className="text-lg font-bold text-card-foreground">{totalSales}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Revenue</span>
              <TrendingUp size={14} className="text-success" />
            </div>
            <p className="text-lg font-bold text-card-foreground">{formatKES(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Periods</span>
              <Calendar size={14} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-card-foreground">{groupKeys.length}</p>
            <p className="text-xs text-muted-foreground">{period} groups</p>
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
          const groupSales = groupedSales[key];
          const groupTotal = groupSales.reduce((s: number, sale: any) => s + sale.total_amount, 0);
          return (
            <Card key={key} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    {key}
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{groupSales.length} sale{groupSales.length > 1 ? 's' : ''}</p>
                    <p className="text-sm font-bold text-primary">{formatKES(groupTotal)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupSales.map((sale: any) => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            #{sale.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(sale.date), 'dd MMM, h:mm a')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sale.customers?.name || <span className="text-muted-foreground">Walk-in</span>}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sale.sale_items?.length || 0} item{(sale.sale_items?.length || 0) !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={paymentBadgeStyle(sale.payment_method)}>
                              {paymentLabel(sale.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {formatKES(sale.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => setSelectedSale(sale)}>
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
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} />
              Invoice #{selectedSale?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div ref={printRef}>
                <div className="header" style={{ textAlign: 'center', marginBottom: 16 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>DeynPro</h1>
                  <p style={{ margin: '4px 0', color: '#666', fontSize: 13 }}>Invoice</p>
                </div>

                <div className="details text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice #:</span>
                    <span className="font-mono">{selectedSale.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(selectedSale.date), 'dd MMM yyyy, h:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{selectedSale.customers?.name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment:</span>
                    <span>{paymentLabel(selectedSale.payment_method)}</span>
                  </div>
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
                    {(selectedSale.sale_items || []).map((item: any, i: number) => (
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
                  <span className="font-bold text-lg text-primary">{formatKES(selectedSale.total_amount)}</span>
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
