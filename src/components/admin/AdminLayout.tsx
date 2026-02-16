import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Bell,
  LogOut,
  Shield,
  AlertTriangle,
  Settings,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAdminAlerts } from '@/hooks/use-admin-alerts';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { alerts } = useAdminAlerts();

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  const navItems: NavItem[] = [
    { title: 'Дашборд', href: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Клиники', href: '/admin/clinics', icon: Building2 },
    { title: 'Подписки', href: '/admin/subscriptions', icon: CreditCard },
    { title: 'Состояние системы', href: '/admin/system-health', icon: Activity },
    { title: 'Аналитика', href: '/admin/analytics', icon: BarChart3 },
    { title: 'Алерты', href: '/admin/alerts', icon: Bell, badge: criticalAlerts },
    { title: 'Настройки', href: '/admin/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="dark flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Super Admin</span>
            <p className="text-xs text-muted-foreground">Dentelica Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* Critical Alert Banner */}
        {criticalAlerts > 0 && (
          <div className="mx-3 mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{criticalAlerts} критических алертов</span>
            </div>
          </div>
        )}

        {/* User Section */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{profile?.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">Super Admin</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
};
