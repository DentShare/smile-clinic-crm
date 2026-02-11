import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Package,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  Building2,
  LogOut,
  Smile,
  Calculator,
  Clock,
  Send,
  Gift,
  ShoppingBag,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const clinicNavItems: NavItem[] = [
  { title: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Пациенты', href: '/patients', icon: Users },
  { title: 'Расписание', href: '/appointments', icon: Calendar },
  { title: 'Лист ожидания', href: '/waiting-list', icon: Clock, roles: ['clinic_admin', 'reception', 'doctor'] },
  { title: 'Зубная формула', href: '/tooth-chart', icon: Smile, roles: ['clinic_admin', 'doctor'] },
  { title: 'Услуги', href: '/services', icon: Stethoscope, roles: ['clinic_admin', 'reception'] },
  { title: 'Абонементы', href: '/packages', icon: ShoppingBag, roles: ['clinic_admin', 'reception'] },
  { title: 'Склад', href: '/inventory', icon: Package, roles: ['clinic_admin', 'reception'] },
  { title: 'Финансы', href: '/finance', icon: CreditCard, roles: ['clinic_admin', 'reception'] },
  { title: 'Расчёт ЗП', href: '/salary', icon: Calculator, roles: ['clinic_admin', 'doctor'] },
  { title: 'Лояльность', href: '/loyalty', icon: Gift, roles: ['clinic_admin', 'reception'] },
  { title: 'Рассылки', href: '/campaigns', icon: Send, roles: ['clinic_admin', 'reception'] },
  { title: 'Онлайн-чат', href: '/live-chat', icon: MessageCircle, roles: ['clinic_admin', 'reception'] },
  { title: 'Документы', href: '/documents', icon: FileText, roles: ['clinic_admin', 'reception'] },
  { title: 'Аналитика', href: '/analytics', icon: BarChart3, roles: ['clinic_admin'] },
  { title: 'Настройки', href: '/settings', icon: Settings, roles: ['clinic_admin'] },
];

const superAdminNavItems: NavItem[] = [
  { title: 'Панель управления', href: '/admin', icon: LayoutDashboard },
  { title: 'Клиники', href: '/admin/clinics', icon: Building2 },
  { title: 'Подписки', href: '/admin/subscriptions', icon: CreditCard },
  { title: 'Аналитика', href: '/admin/analytics', icon: BarChart3 },
];

export const Sidebar = () => {
  const location = useLocation();
  const { profile, clinic, isSuperAdmin, signOut, hasRole } = useAuth();

  // In the CRM layout (DashboardLayout), always show clinic navigation
  // Super admin nav is only used inside the AdminLayout
  const navItems = clinicNavItems;

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    // Super admins in CRM context can see everything
    if (isSuperAdmin) return true;
    return item.roles.some(role => hasRole(role as any));
  });

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <span className="text-2xl">🦷</span>
        <div className="flex flex-col">
          <span className="font-semibold">DentaClinic</span>
          {clinic && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {clinic.name}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isSuperAdmin ? 'Super Admin' : profile?.specialization || 'Сотрудник'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </div>
    </div>
  );
};
