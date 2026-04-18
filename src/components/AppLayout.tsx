import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowLeftRight, LogOut, Menu, X, Package, Truck, ShoppingCart, Receipt, Bell, BarChart3, FileText, UserCircle2, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth, emailToUsername } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useRole';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const username = emailToUsername(user?.email);
  const { isAdmin } = useIsAdmin();
  const { showHelp, setShowHelp } = useKeyboardShortcuts();
  const { data: alerts } = useStockAlerts();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/products', icon: Package, label: t('nav.products') },
    { to: '/sales', icon: ShoppingCart, label: t('nav.sales') },
    { to: '/customers', icon: Users, label: t('nav.customers') },
    { to: '/transactions', icon: ArrowLeftRight, label: t('nav.debts') },
    { to: '/suppliers', icon: Truck, label: t('nav.suppliers') },
    { to: '/expenses', icon: Receipt, label: t('nav.expenses') },
    { to: '/invoices', icon: FileText, label: t('nav.invoices') },
    { to: '/reports', icon: BarChart3, label: t('nav.reports') },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin Panel' }] : []),
  ];

  const unreadAlerts = alerts?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 gradient-primary md:hidden">
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">{t('app.name')}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
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
          <nav className="absolute start-0 top-0 bottom-0 w-64 bg-card p-6 shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-primary">{t('app.name')}</h2>
            {username && (
              <div className="mt-3 mb-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60">
                <UserCircle2 size={16} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{t('auth.signedInAs')}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{username}</p>
                </div>
              </div>
            )}
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
              <LogOut size={18} className="me-2" /> {t('nav.signOut')}
            </Button>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-col fixed inset-y-0 start-0 bg-card border-e border-border z-30">
          <div className="p-6 pb-4">
            <h1 className="text-2xl font-bold text-primary tracking-tight">{t('app.name')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('app.tagline')}</p>
            {username && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60">
                <UserCircle2 size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{t('auth.signedInAs')}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{username}</p>
                </div>
              </div>
            )}
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
          <div className="p-3 space-y-2">
            <div className="px-1">
              <LanguageSwitcher />
            </div>
            {unreadAlerts > 0 && (
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-warning text-sm font-medium">
                <Bell size={16} />
                {t('nav.alerts', { count: unreadAlerts })}
              </Link>
            )}
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut size={18} className="me-2" /> {t('nav.signOut')}
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ms-56 lg:ms-64 min-h-screen">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav - show top 5 items */}
      <nav className="fixed bottom-0 start-0 end-0 z-50 bg-card border-t border-border flex md:hidden">
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
      <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
