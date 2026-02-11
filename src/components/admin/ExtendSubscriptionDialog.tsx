import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import type { ClinicTenant } from '@/types/superAdmin';

interface Plan {
  id: string;
  name: string;
  name_ru: string;
  price_monthly: number;
  max_doctors: number | null;
  max_staff: number | null;
  features: Record<string, boolean>;
}

interface ExtendSubscriptionDialogProps {
  clinic: ClinicTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 месяц' },
  { value: '3', label: '3 месяца' },
  { value: '6', label: '6 месяцев' },
  { value: '12', label: '12 месяцев' },
  { value: '24', label: '24 месяца' },
];

const DOCTOR_COUNT_OPTIONS = [
  { value: '1', label: '1 врач' },
  { value: '2', label: '2 врача' },
  { value: '3', label: '3 врача' },
  { value: '4', label: '4 врача' },
  { value: '5', label: '5 врачей' },
  { value: '6', label: '6 врачей' },
  { value: '7', label: '7 врачей' },
  { value: '8', label: '8 врачей' },
  { value: '9', label: '9 врачей' },
  { value: '10', label: '10 врачей' },
  { value: '0', label: 'Безлимит' },
];

export function ExtendSubscriptionDialog({
  clinic,
  open,
  onOpenChange,
  onSuccess,
}: ExtendSubscriptionDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [duration, setDuration] = useState('1');
  const [doctorCount, setDoctorCount] = useState('2');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlans();
      // Pre-fill from current subscription
      if (clinic?.subscription) {
        setSelectedPlanId(clinic.subscription.plan_id);
      }
    }
  }, [open, clinic]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('id, name, name_ru, price_monthly, max_doctors, max_staff, features')
      .eq('is_active', true)
      .order('price_monthly');
    if (data) {
      setPlans(data.map(p => ({
        ...p,
        features: (p.features as Record<string, boolean>) || {},
      })));
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const totalPrice = selectedPlan
    ? selectedPlan.price_monthly * parseInt(duration)
    : 0;

  const handleSubmit = async () => {
    if (!clinic || !selectedPlanId) return;
    setLoading(true);

    try {
      const durationMonths = parseInt(duration);
      const doctors = parseInt(doctorCount);

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
          reason: reason || `Продление: ${selectedPlan?.name_ru}, ${durationMonths} мес., ${doctors === 0 ? 'безлимит' : doctors} врачей`,
        });

      if (adjustmentError) throw adjustmentError;

      // Update subscription
      const { error: subError } = await supabase
        .from('clinic_subscriptions')
        .update({
          plan_id: selectedPlanId,
          current_period_end: newEnd.toISOString(),
          current_period_start: new Date().toISOString(),
          status: 'active',
          max_doctors_override: doctors === 0 ? null : doctors,
          billing_period_months: durationMonths,
        } as any)
        .eq('clinic_id', clinic.id);

      if (subError) throw subError;

      // Add billing history record
      await supabase.from('billing_history').insert({
        clinic_id: clinic.id,
        amount: totalPrice,
        status: 'paid',
        payment_method: 'manual',
        description: `${selectedPlan?.name_ru} — ${durationMonths} мес., ${doctors === 0 ? 'безлимит' : doctors} врачей`,
      });

      toast.success(`Подписка обновлена: ${selectedPlan?.name_ru}, ${durationMonths} мес.`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Ошибка при обновлении подписки');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPlanId('');
    setDuration('1');
    setDoctorCount('2');
    setReason('');
  };

  if (!clinic) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Продлить подписку
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium">{clinic.name}</p>
            <p className="text-sm text-muted-foreground">
              {clinic.subdomain}.dent-crm.uz
            </p>
            {clinic.subscription && (
              <p className="text-xs text-muted-foreground mt-1">
                Текущий: {clinic.subscription.plan_name_ru} — {clinic.subscription.status}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Тариф</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тариф" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name_ru} — {(plan.price_monthly / 1000).toFixed(0)}k сум/мес
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Срок подписки</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Количество врачей</Label>
            <Select value={doctorCount} onValueChange={setDoctorCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCTOR_COUNT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div className="bg-muted/50 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Тариф:</span>
                <span className="font-medium">{selectedPlan.name_ru}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Срок:</span>
                <span className="font-medium">{duration} мес.</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Врачей:</span>
                <span className="font-medium">{doctorCount === '0' ? 'Безлимит' : doctorCount}</span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between font-medium">
                <span>Итого:</span>
                <span>{totalPrice.toLocaleString('ru-RU')} сум</span>
              </div>
            </div>
          )}

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
          <Button onClick={handleSubmit} disabled={loading || !selectedPlanId}>
            <Plus className="h-4 w-4 mr-2" />
            {loading ? 'Обновление...' : 'Продлить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
