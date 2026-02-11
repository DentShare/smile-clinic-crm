import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ─── Pricing config (matches landing page) ─── */
const periods = [
  { months: 3, discount: 0, label: '3 мес.' },
  { months: 6, discount: 10, label: '6 мес.' },
  { months: 12, discount: 20, label: '12 мес.' },
  { months: 24, discount: 30, label: '24 мес.' },
];

const doctorOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const plans = [
  { key: 'basic', name: 'Базовый', basePrice: 99_000 },
  { key: 'standard', name: 'Плановый', basePrice: 190_000 },
  { key: 'strategic', name: 'Стратегический', basePrice: 290_000 },
  { key: 'management', name: 'Управленческий', basePrice: 390_000 },
];

function formatPrice(n: number) {
  return n.toLocaleString('ru-RU');
}

interface CreateClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateClinicDialog = ({ open, onOpenChange, onSuccess }: CreateClinicDialogProps) => {
  const [clinicName, setClinicName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [country, setCountry] = useState('UZ');
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedDoctors, setSelectedDoctors] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  const period = periods[selectedPeriod];
  const plan = plans[selectedPlan];
  const doctorCount = doctorOptions[selectedDoctors];

  const price = useMemo(() => {
    const monthly = Math.round(plan.basePrice * doctorCount * (1 - period.discount / 100));
    const total = monthly * period.months;
    return { monthly, total };
  }, [selectedPlan, selectedPeriod, selectedDoctors]);

  const resetForm = () => {
    setClinicName(''); setSubdomain(''); setOwnerName(''); setOwnerEmail('');
    setOwnerPhone(''); setOwnerPassword(''); setCountry('UZ');
    setSelectedPlan(0); setSelectedPeriod(0); setSelectedDoctors(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-clinic', {
        body: {
          email: ownerEmail,
          password: ownerPassword,
          full_name: ownerName,
          phone: ownerPhone,
          clinic_name: clinicName,
          subdomain,
          country,
          plan_index: selectedPlan,
          period_months: period.months,
          doctor_count: doctorCount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Клиника создана', { description: `${clinicName} — ${ownerEmail}` });
      resetForm(); onOpenChange(false); onSuccess();
    } catch (error: any) {
      console.error('Create clinic error:', error);
      toast.error('Ошибка создания клиники', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Создать новую клинику
          </DialogTitle>
          <DialogDescription>Заполните данные владельца и выберите тариф</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Данные клиники</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название клиники</Label>
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Digital Implant" required />
              </div>
              <div className="space-y-2">
                <Label>Поддомен</Label>
                <div className="flex items-center gap-2">
                  <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="digital" required className="flex-1" />
                  <span className="text-xs text-muted-foreground">.dent-crm.uz</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Имя владельца</Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Иван Иванов" required />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+998901234567" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email владельца</Label>
                <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="admin@clinic.uz" required />
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Минимум 6 символов" required minLength={6} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Страна</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZ">🇺🇿 Узбекистан</SelectItem>
                  <SelectItem value="KZ">🇰🇿 Казахстан</SelectItem>
                  <SelectItem value="KG">🇰🇬 Кыргызстан</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Тариф</h3>

            <div className="space-y-2">
              <Label>Тарифный план</Label>
              <div className="grid grid-cols-4 gap-2">
                {plans.map((p, i) => (
                  <button key={p.key} type="button" onClick={() => setSelectedPlan(i)} className={cn(
                    'flex flex-col items-center px-3 py-2.5 rounded-lg border-2 transition-all text-sm',
                    selectedPlan === i
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  )}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs mt-0.5">{formatPrice(p.basePrice)}/врач</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Срок подписки</Label>
              <div className="flex gap-2">
                {periods.map((p, i) => (
                  <button key={p.months} type="button" onClick={() => setSelectedPeriod(i)} className={cn(
                    'flex flex-col items-center px-4 py-2 rounded-lg border-2 transition-all text-sm',
                    selectedPeriod === i
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  )}>
                    <span className="font-medium">{p.label}</span>
                    {p.discount > 0 && (
                      <Badge variant="secondary" className="mt-1 text-[10px] bg-success/20 text-success border-0">−{p.discount}%</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Количество врачей</Label>
              <div className="flex gap-2">
                {doctorOptions.map((d, i) => (
                  <button key={d} type="button" onClick={() => setSelectedDoctors(i)} className={cn(
                    'w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all',
                    selectedDoctors === i
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  )}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Итого за {period.months} мес.</p>
                  <p className="text-2xl font-bold text-foreground">{formatPrice(price.total)} so'm</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">В месяц</p>
                  <p className="text-lg font-semibold text-primary">{formatPrice(price.monthly)} so'm</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {plan.name} • {doctorCount} {doctorCount === 1 ? 'врач' : doctorCount < 5 ? 'врача' : 'врачей'} • {period.months} мес.
                {period.discount > 0 && ` • скидка ${period.discount}%`}
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>) : 'Создать клинику'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
