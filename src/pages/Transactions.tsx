import { useAllTransactions } from '@/hooks/useCustomers';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function Transactions() {
  const { data: transactions, isLoading } = useAllTransactions();

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground">All debts and payments</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      <div className="space-y-2">
        {transactions?.map(tx => (
          <Card key={tx.id} className="shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">{tx.customers?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {tx.description || tx.type} · {format(new Date(tx.date), 'MMM d, yyyy')}
                </p>
              </div>
              <span className={`text-sm font-bold ${tx.type === 'payment' ? 'text-success' : 'text-destructive'}`}>
                {tx.type === 'payment' ? '-' : '+'}{formatKES(tx.amount)}
              </span>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (transactions?.length || 0) === 0 && (
          <p className="text-center text-muted-foreground py-8">No transactions yet</p>
        )}
      </div>
    </div>
  );
}
