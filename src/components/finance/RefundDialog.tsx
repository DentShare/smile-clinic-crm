import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-methods';
import { formatCurrency } from '@/lib/formatters';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  payment: {
    id: string;
    amount: number;
    method: string;
    date: string;
  };
  onRefundComplete?: () => void;
}

const REFUND_METHODS = ['cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer'];

export function RefundDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  payment,
  onRefundComplete,
}: RefundDialogProps) {
  const [amount, setAmount] = useState(payment.amount.toString());
  const [method, setMethod] = useState(payment.method || 'cash');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Укажите корректную сумму');
      return;
    }

    if (numAmount > payment.amount) {
      toast.error(`Сумма возврата не может превышать ${formatCurrency(payment.amount)}`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, clinic_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (!profile?.clinic_id) throw new Error('No clinic associated');

      const { data, error } = await supabase.rpc('process_patient_refund', {
        p_clinic_id: profile.clinic_id,
        p_patient_id: patientId,
        p_payment_id: payment.id,
        p_amount: numAmount,
        p_reason: reason || null,
        p_refund_method: method,
        p_refunded_by: profile.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number; new_balance?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка возврата');
      }

      toast.success(`Возврат ${formatCurrency(numAmount)} выполнен успешно`);
      setAmount('');
      setReason('');
      onOpenChange(false);
      onRefundComplete?.();
    } catch (err) {
      console.error('Refund error:', err);
      toast.error(err instanceof Error ? err.message : 'Ошибка выполнения возврата');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount(payment.amount.toString());
      setReason('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Возврат средств
          </DialogTitle>
          <DialogDescription>
            Пациент: {patientName}
            <span className="block mt-1">
              Исходный платёж: {formatCurrency(payment.amount)} от{' '}
              {new Date(payment.date).toLocaleDateString('ru-RU')}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Сумма возврата (сум)</Label>
            <Input
              id="refund-amount"
              type="text"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d\s,]/g, ''))}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Максимум: {formatCurrency(payment.amount)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-method">Способ возврата</Label>
            <Select value={method} onValueChange={setMethod} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m] ?? m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Причина возврата</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Опишите причину возврата"
              disabled={loading}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={loading || !amount || parseFloat(amount.replace(/\s/g, '')) <= 0}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Выполнить возврат'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
