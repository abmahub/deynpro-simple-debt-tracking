import { useAllTransactions } from '@/hooks/useCustomers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { exportToExcel } from '@/lib/excelExport';
import { toast } from 'sonner';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

export default function Transactions() {
  const { data: transactions, isLoading } = useAllTransactions();

  const handleExport = () => {
    const rows = (transactions || []).map(tx => ({
      Date: format(new Date(tx.date), 'yyyy-MM-dd HH:mm'),
      Customer: tx.customers?.name || '',
      Phone: tx.customers?.phone || '',
      Type: tx.type,
      Amount: tx.amount,
      Description: tx.description || '',
      'Due Date': tx.due_date || '',
    }));
    exportToExcel('DeynPro_Transactions', [{ name: 'Transactions', rows }]);
    toast.success('Excel downloaded');
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">All debts and payments</p>
        </div>
        <Button variant="outline" className="gap-1" onClick={handleExport} disabled={!transactions?.length}>
          <FileSpreadsheet size={16} /> Excel
        </Button>
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
