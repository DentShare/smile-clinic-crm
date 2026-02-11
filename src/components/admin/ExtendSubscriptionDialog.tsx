import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import type { ClinicTenant } from '@/types/superAdmin';

interface ExtendSubscriptionDialogProps {
  clinic: ClinicTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExtendSubscriptionDialog({
  clinic,
  open,
  onOpenChange,
  onSuccess,
}: ExtendSubscriptionDialogProps) {
  const [days, setDays] = useState('30');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!clinic || !days) return;
    setLoading(true);
    
    try {
      // Insert adjustment record
      const { error: adjustmentError } = await supabase
        .from('billing_manual_adjustments')
        .insert({
          clinic_id: clinic.id,
          days_added: parseInt(days),
          reason: reason || 'Ручное продление подписки',
        });

      if (adjustmentError) throw adjustmentError;

      // Update subscription end date
      const currentEnd = clinic.subscription?.current_period_end 
        ? new Date(clinic.subscription.current_period_end)
        : new Date();
      
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + parseInt(days));

      const { error: subError } = await supabase
        .from('clinic_subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
          status: 'active',
        })
        .eq('clinic_id', clinic.id);

      if (subError) throw subError;

      toast.success(`Подписка продлена на ${days} дней`);
      setDays('30');
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Ошибка при продлении подписки');
    } finally {
      setLoading(false);
    }
  };

  if (!clinic) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          </div>

          <div>
            <Label>Количество дней</Label>
            <Input 
              type="number" 
              value={days} 
              onChange={(e) => setDays(e.target.value)}
              placeholder="30"
            />
          </div>

          <div>
            <Label>Причина (опционально)</Label>
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
          <Button onClick={handleSubmit} disabled={loading || !days}>
            <Plus className="h-4 w-4 mr-2" />
            {loading ? 'Продление...' : 'Продлить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
