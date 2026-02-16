import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ClinicTenant } from '@/types/superAdmin';

interface ExtendSubscriptionDialogProps {
  clinic: ClinicTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/* ─── Same pricing config as landing page ─── */
const periods = [
  { months: 3, discount: 0, label: '3 мес.' },
  { months: 6, discount: 10, label: '6 мес.' },
  { months: 12, discount: 20, label: '12 мес.' },
  { months: 24, discount: 30, label: '24 мес.' },
];

const doctorOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const planConfigs = [
  { key: 'basic', name: 'Базовый', basePrice: 99_000 },
  { key: 'standard', name: 'Плановый', basePrice: 190_000 },
  { key: 'strategic', name: 'Стратегический', basePrice: 290_000 },
  { key: 'management', name: 'Управленческий', basePrice: 390_000 },
];

function formatPrice(n: number) {
  return n.toLocaleString('ru-RU');
}

interface DbPlan {
  id: string;
  name: string;
  name_ru: string;
  price_monthly: number;
}

export function ExtendSubscriptionDialog({
  clinic,
  open,
  onOpenChange,
  onSuccess,
}: ExtendSubscriptionDialogProps) {
  const [dbPlans, setDbPlans] = useState<DbPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedDoctors, setSelectedDoctors] = useState(1); // index
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, name_ru, price_monthly')
      .eq('is_active', true)
      .order('price_monthly');
    if (data) setDbPlans(data);
  };

  const period = periods[selectedPeriod];
  const planConfig = planConfigs[selectedPlan];
  const doctorCount = doctorOptions[selectedDoctors];

  const price = useMemo(() => {
    const monthly = Math.round(planConfig.basePrice * doctorCount * (1 - period.discount / 100));
    const total = monthly * period.months;
    return { monthly, total };
  }, [selectedPlan, selectedPeriod, selectedDoctors]);

  const handleSubmit = async () => {
    if (!clinic) return;
    setLoading(true);

    try {
      // Match DB plan by index
      const dbPlan = dbPlans[Math.min(selectedPlan, dbPlans.length - 1)];
      if (!dbPlan) throw new Error('Тариф не найден');

      const durationMonths = period.months;

      // Calculate new period end
      const currentEnd = clinic.subscription?.current_period_end
        ? new Date(clinic.subscription.current_period_end)
        : new Date();
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEnd = new Date(baseDate);
      newEnd.setMonth(newEnd.getMonth() + durationMonths);

      // Insert adjustment record
      const { error: adjustmentError } = await supabase
        .from('billing_manual_adjustments')
        .insert({
          clinic_id: clinic.id,
          days_added: durationMonths * 30,
          reason: reason || `Продление: ${planConfig.name}, ${durationMonths} мес., ${doctorCount} врачей`,
        });
      if (adjustmentError) throw adjustmentError;

      // Update subscription
      const { error: subError } = await supabase
        .from('clinic_subscriptions')
        .update({
          plan_id: dbPlan.id,
          current_period_end: newEnd.toISOString(),
          current_period_start: new Date().toISOString(),
          status: 'active',
          max_doctors_override: doctorCount,
          billing_period_months: durationMonths,
        } as any)
        .eq('clinic_id', clinic.id);
      if (subError) throw subError;

      // Add billing history record
      await supabase.from('billing_history').insert({
        clinic_id: clinic.id,
        amount: price.total,
        status: 'paid',
        payment_method: 'manual',
        description: `${planConfig.name} — ${durationMonths} мес., ${doctorCount} врачей`,
      });

      toast.success(`Подписка обновлена: ${planConfig.name}, ${durationMonths} мес.`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Ошибка при обновлении подписки');
    } finally {
      setLoading(false);
    }
  };

  if (!clinic) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Продлить подписку
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Clinic info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium">{clinic.name}</p>
            <p className="text-sm text-muted-foreground">{clinic.subdomain}.dentelica.uz</p>
            {clinic.subscription && (
              <p className="text-xs text-muted-foreground mt-1">
                Текущий: {clinic.subscription.plan_name_ru} — {clinic.subscription.status}
              </p>
            )}
          </div>

          {/* Plan selector */}
          <div className="space-y-2">
            <Label>Тарифный план</Label>
            <div className="grid grid-cols-2 gap-2">
              {planConfigs.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPlan(i)}
                  className={cn(
                    'flex flex-col items-center px-3 py-2.5 rounded-lg border-2 transition-all text-sm',
                    selectedPlan === i
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  )}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs mt-0.5">{formatPrice(p.basePrice)}/врач</span>
                </button>
              ))}
            </div>
          </div>

          {/* Period selector */}
          <div className="space-y-2">
            <Label>Срок подписки</Label>
            <div className="flex gap-2">
              {periods.map((p, i) => (
                <button
                  key={p.months}
                  type="button"
                  onClick={() => setSelectedPeriod(i)}
                  className={cn(
                    'flex flex-col items-center px-4 py-2 rounded-lg border-2 transition-all text-sm flex-1',
                    selectedPeriod === i
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  )}
                >
                  <span className="font-medium">{p.label}</span>
                  {p.discount > 0 && (
                    <Badge variant="secondary" className="mt-1 text-[10px] bg-primary/10 text-primary border-0">
                      −{p.discount}%
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Doctor count selector */}
          <div className="space-y-2">
            <Label>Количество врачей</Label>
            <div className="flex gap-2">
              {doctorOptions.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDoctors(i)}
                  className={cn(
                    'w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all',
                    selectedDoctors === i
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/50'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Price summary */}
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
              {planConfig.name} • {doctorCount} {doctorCount === 1 ? 'врач' : doctorCount < 5 ? 'врача' : 'врачей'} • {period.months} мес.
              {period.discount > 0 && ` • скидка ${period.discount}%`}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Комментарий (опционально)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Оплата через Click, банковский перевод..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            {loading ? 'Обновление...' : `Продлить — ${formatPrice(price.total)} so'm`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
