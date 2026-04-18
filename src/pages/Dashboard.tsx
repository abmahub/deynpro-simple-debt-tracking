import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '@/hooks/useCustomers';
import { useLowStockProducts } from '@/hooks/useProducts';
import { useSales } from '@/hooks/useSales';
import { useExpenses } from '@/hooks/useExpenses';
import { useStockAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useStockAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Package, ShoppingCart, Receipt, Bell, X, CheckCheck, MessageCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, isPast, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAllTransactions } from '@/hooks/useCustomers';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

function formatPhone(phone: string) {
  let clean = phone.replace(/\s+/g, '');
  if (clean.startsWith('0')) clean = '254' + clean.slice(1);
  if (!clean.startsWith('+')) clean = '+' + clean;
  return clean.replace('+', '');
}

function openWhatsApp(phone: string, message: string) {
  const num = formatPhone(phone);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: lowStockProducts } = useLowStockProducts();
  const { data: sales } = useSales();
  const { data: expenses } = useExpenses();
  const { data: alerts } = useStockAlerts();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const { data: allTransactions } = useAllTransactions();

  const overdueDebts = (allTransactions || []).filter(
    (tx: any) => tx.type === 'debt' && tx.due_date && isPast(parseISO(tx.due_date))
  );

  const totalSalesRevenue = (sales || []).reduce((s, sale: any) => s + sale.total_amount, 0);
  const totalExpenses = (expenses || []).reduce((s, e: any) => s + e.amount, 0);
  const todaySales = (sales || []).filter((s: any) => {
    const today = new Date().toDateString();
    return new Date(s.date).toDateString() === today;
  });
  const todayRevenue = todaySales.reduce((s: number, sale: any) => s + sale.total_amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  const cards = [
    { label: t('dashboard.todaySales'), value: formatKES(todayRevenue), icon: ShoppingCart, color: 'text-primary' },
    { label: t('dashboard.totalRevenue'), value: formatKES(totalSalesRevenue), icon: TrendingUp, color: 'text-success' },
    { label: t('dashboard.totalExpenses'), value: formatKES(totalExpenses), icon: Receipt, color: 'text-destructive' },
    { label: t('dashboard.customers'), value: stats?.customerCount || 0, icon: Users, color: 'text-accent' },
    { label: t('dashboard.outstandingDebt'), value: formatKES(stats?.totalDebt || 0), icon: TrendingDown, color: 'text-warning' },
    { label: t('dashboard.lowStockItems'), value: lowStockProducts?.length || 0, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.overview')}</p>
      </div>

      {(alerts?.length || 0) > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <Bell size={16} /> {t('dashboard.stockAlerts')} ({alerts!.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAllRead.mutate()}>
                <CheckCheck size={14} className="me-1" /> {t('dashboard.markAllRead')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts!.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="text-card-foreground">{alert.message}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead.mutate(alert.id)}>
                  <X size={12} />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(card => (
          <Card key={card.label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <card.icon size={16} className={card.color} />
              </div>
              <p className="text-xl font-bold text-card-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('dashboard.netProfitLoss')}</p>
              <p className={`text-2xl font-bold ${totalSalesRevenue - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatKES(totalSalesRevenue - totalExpenses)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs text-muted-foreground">{t('dashboard.revenueMinusExpenses')}</p>
              <p className="text-xs text-muted-foreground">{formatKES(totalSalesRevenue)} - {formatKES(totalExpenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(stats?.chartData?.length || 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.monthlyPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats!.chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatKES(value)} />
                <Bar dataKey="amount" fill="hsl(160, 60%, 38%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {overdueDebts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle size={16} /> {t('dashboard.overdueDebts')} ({overdueDebts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueDebts.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{tx.customers?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatKES(tx.amount)} · {t('dashboard.due')}: {format(new Date(tx.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs border-[hsl(142,70%,45%)] text-[hsl(142,70%,45%)]"
                  onClick={() => {
                    if (tx.customers?.phone) {
                      const dueClause = t('whatsapp.dueClause', { date: format(new Date(tx.due_date), 'MMM d, yyyy') });
                      const msg = t('whatsapp.debtReminder', {
                        name: tx.customers.name,
                        amount: tx.amount.toLocaleString(),
                        dueClause,
                      });
                      openWhatsApp(tx.customers.phone, msg);
                    }
                  }}
                >
                  <MessageCircle size={14} /> {t('dashboard.remind')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.lowStockProducts')}</CardTitle>
              <Link to="/products" className="text-xs text-primary hover:underline">{t('dashboard.viewAll')}</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(lowStockProducts?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.allStocked')}</p>
            )}
            {lowStockProducts?.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-warning" />
                  <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                </div>
                <span className={`text-sm font-semibold ${p.quantity === 0 ? 'text-destructive' : 'text-warning'}`}>
                  {t('dashboard.leftInStock', { count: p.quantity })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.outstandingDebts')}</CardTitle>
              <Link to="/transactions" className="text-xs text-primary hover:underline">{t('dashboard.viewAll')}</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.overdueCustomers?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noOutstanding')}</p>
            )}
            {stats?.overdueCustomers?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <span className="text-sm font-semibold text-destructive">{formatKES(c.balance)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/sales">
              <Button variant="outline" className="w-full gap-2"><ShoppingCart size={16} /> {t('dashboard.newSale')}</Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" className="w-full gap-2"><Package size={16} /> {t('dashboard.addProduct')}</Button>
            </Link>
            <Link to="/customers">
              <Button variant="outline" className="w-full gap-2"><Users size={16} /> {t('dashboard.addCustomer')}</Button>
            </Link>
            <Link to="/expenses">
              <Button variant="outline" className="w-full gap-2"><Receipt size={16} /> {t('dashboard.addExpense')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
