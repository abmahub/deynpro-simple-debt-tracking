import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowLeftRight, LogOut, Menu, X, Package, Truck, ShoppingCart, Receipt, Bell, BarChart3, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Debts' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  useKeyboardShortcuts();
  const { data: alerts } = useStockAlerts();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadAlerts = alerts?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 gradient-primary md:hidden">
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">DeynPro</h1>
        <div className="flex items-center gap-2">
          {unreadAlerts > 0 && (
            <Link to="/" className="relative text-primary-foreground">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {unreadAlerts}
              </span>
            </Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-primary-foreground">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/20" />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-primary mb-8">DeynPro</h2>
            <div className="space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.to
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
            <Button variant="ghost" className="mt-8 w-full justify-start text-destructive" onClick={signOut}>
              <LogOut size={18} className="mr-2" /> Sign Out
            </Button>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-col fixed inset-y-0 left-0 bg-card border-r border-border z-30">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-primary tracking-tight">DeynPro</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Shop Management</p>
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3">
            {unreadAlerts > 0 && (
              <Link to="/" className="flex items-center gap-2 px-3 py-2 mb-2 text-warning text-sm font-medium">
                <Bell size={16} />
                {unreadAlerts} alert{unreadAlerts > 1 ? 's' : ''}
              </Link>
            )}
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut size={18} className="mr-2" /> Sign Out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-56 lg:ml-64 min-h-screen">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav - show top 5 items */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex md:hidden">
        {navItems.slice(0, 5).map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              location.pathname === item.to ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
