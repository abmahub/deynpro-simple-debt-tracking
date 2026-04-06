import { useDashboardStats } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

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
    { label: 'Total Debt', value: formatKES(stats?.totalDebt || 0), icon: TrendingDown, color: 'text-destructive' },
    { label: 'Payments Received', value: formatKES(stats?.totalPayments || 0), icon: TrendingUp, color: 'text-success' },
    { label: 'Customers', value: stats?.customerCount || 0, icon: Users, color: 'text-accent' },
    { label: 'Overdue', value: stats?.overdueCount || 0, icon: AlertTriangle, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Business overview</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      {/* Chart */}
      {(stats?.chartData?.length || 0) > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payments</CardTitle>
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

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.recentTransactions?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            )}
            {stats?.recentTransactions?.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{tx.description || tx.type}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(tx.date), 'MMM d, yyyy')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'payment' ? 'text-success' : 'text-destructive'}`}>
                  {tx.type === 'payment' ? '-' : '+'}{formatKES(tx.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overdue Customers */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.overdueCustomers?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No overdue debts 🎉</p>
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
    </div>
  );
}
