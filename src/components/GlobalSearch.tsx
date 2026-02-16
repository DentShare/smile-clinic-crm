import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
  Calculator,
  Gift,
  Send,
  MessageCircle,
  Shield,
  ShoppingBag,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const pages = [
  { title: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Пациенты', href: '/patients', icon: Users },
  { title: 'Расписание', href: '/appointments', icon: Calendar },
  { title: 'Услуги', href: '/services', icon: Stethoscope },
  { title: 'Абонементы', href: '/packages', icon: ShoppingBag },
  { title: 'Склад', href: '/inventory', icon: Package },
  { title: 'Финансы', href: '/finance', icon: CreditCard },
  { title: 'Расчёт ЗП', href: '/salary', icon: Calculator },
  { title: 'Лояльность', href: '/loyalty', icon: Gift },
  { title: 'Рассылки', href: '/campaigns', icon: Send },
  { title: 'Онлайн-чат', href: '/live-chat', icon: MessageCircle },
  { title: 'Документы', href: '/documents', icon: FileText },
  { title: 'Аналитика', href: '/analytics', icon: BarChart3 },
  { title: 'Журнал аудита', href: '/audit-log', icon: Shield },
  { title: 'Настройки', href: '/settings', icon: Settings },
];

interface PatientResult {
  id: string;
  full_name: string;
  phone: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const navigate = useNavigate();
  const { clinic } = useAuth();

  // Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search patients when query changes
  const searchPatients = useCallback(async (q: string) => {
    if (!clinic?.id || q.length < 2) {
      setPatients([]);
      return;
    }
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('clinic_id', clinic.id)
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5);
    setPatients(data || []);
  }, [clinic?.id]);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchPatients]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    navigate(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative h-8 w-full justify-start text-sm text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Поиск...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          Ctrl+K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Поиск по страницам и пациентам..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>

          <CommandGroup heading="Страницы">
            {pages
              .filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase()))
              .map((page) => (
                <CommandItem
                  key={page.href}
                  value={page.title}
                  onSelect={() => handleSelect(page.href)}
                >
                  <page.icon className="mr-2 h-4 w-4" />
                  {page.title}
                </CommandItem>
              ))}
          </CommandGroup>

          {patients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Пациенты">
                {patients.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`patient-${p.full_name}`}
                    onSelect={() => handleSelect(`/patients/${p.id}`)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{p.full_name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{p.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
