import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-methods';
import { Loader2, Gift, Wallet, Plus, X } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentDebt: number;
  onPaymentComplete?: () => void;
}

const PAYMENT_METHODS = ['cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer'];

interface PaymentLine {
  id: string;
  method: string;
  amount: string;
}

export function PaymentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentDebt,
  onPaymentComplete,
}: PaymentDialogProps) {
  const { clinic, profile } = useAuth();
  const [lines, setLines] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const { processPayment } = usePatientFinance(patientId);

  // Bonus & deposit balances
  const [bonusBalance, setBonusBalance] = useState(0);
  const [depositBalance, setDepositBalance] = useState(0);
  const [loadingBalances, setLoadingBalances] = useState(false);

  useEffect(() => {
    if (open && patientId && clinic?.id) {
      fetchBalances();
    }
  }, [open, patientId, clinic?.id]);

  const fetchBalances = async () => {
    if (!clinic?.id) return;
    setLoadingBalances(true);
    const [loyaltyRes, depositRes] = await Promise.all([
      supabase.from('patient_loyalty').select('bonus_balance').eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
      supabase.from('patient_deposits').select('balance').eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
    ]);
    setBonusBalance(loyaltyRes.data?.bonus_balance || 0);
    setDepositBalance(depositRes.data?.balance || 0);
    setLoadingBalances(false);
  };

  const addLine = () => {
    // Use crypto.randomUUID() for secure, unpredictable IDs
    setLines(prev => [...prev, { id: crypto.randomUUID(), method: 'cash', amount: '' }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: 'method' | 'amount', value: string) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  /**
   * Parses and validates payment amount
   * Returns 0 for invalid inputs
   */
  const parseAmount = (str: string) => {
    const num = parseFloat(str.replace(/\s/g, '').replace(',', '.'));

    // Validation checks
    if (isNaN(num)) return 0;
    if (num <= 0) return 0;
    if (num > 100000000) {
      // 100 million limit
      console.warn('[PaymentDialog] Amount exceeds maximum allowed:', num);
      return 0;
    }

    // Round to 2 decimal places to avoid floating point issues
    return Math.round(num * 100) / 100;
  };

  const totalAmount = lines.reduce((sum, l) => sum + parseAmount(l.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submission
    if (loading) {
      console.warn('[PaymentDialog] Payment already in progress, ignoring duplicate submit');
      return;
    }

    // Client-side validation
    if (totalAmount <= 0) {
      console.warn('[PaymentDialog] Invalid total amount:', totalAmount);
      return;
    }

    if (totalAmount > 100000000) {
      alert('Сумма платежа превышает максимально допустимую (100,000,000)');
      return;
    }

    // Validate individual payment methods
    for (const line of lines) {
      const amt = parseAmount(line.amount);
      if (amt > 0) {
        // Check if using bonus/deposit with sufficient balance
        if (line.method === 'bonus' && amt > bonusBalance) {
          alert(`Недостаточно бонусов. Доступно: ${bonusBalance.toLocaleString('ru-RU')}`);
          return;
        }
        if (line.method === 'deposit' && amt > depositBalance) {
          alert(`Недостаточно средств на депозите. Доступно: ${depositBalance.toLocaleString('ru-RU')}`);
          return;
        }
      }
    }

    setLoading(true);
    let paymentSuccess = false;

    try {
      // Process all payment lines sequentially with proper error handling
      // Each line gets its own unique idempotency key
      for (const line of lines) {
        const amt = parseAmount(line.amount);
        if (amt <= 0) continue;

        if (line.method === 'bonus') {
          const { data, error } = await supabase.rpc('process_bonus_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_deducted_by: profile?.id || null,
          });
          if (error) throw new Error(`Ошибка списания бонусов: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string };
          if (!result.success) throw new Error(result.error || 'Ошибка списания бонусов');
        } else if (line.method === 'deposit') {
          const { data, error } = await supabase.rpc('process_deposit_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_deducted_by: profile?.id || null,
          });
          if (error) throw new Error(`Ошибка списания с депозита: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string };
          if (!result.success) throw new Error(result.error || 'Ошибка списания с депозита');
        } else {
          // Use the new server-side validated RPC function with idempotency key
          const lineIdempotencyKey = `${currentIdempotencyKey}-${line.id}`;
          const { data, error } = await supabase.rpc('process_patient_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_method: line.method,
            p_processed_by: profile?.user_id || null,
            p_notes: notes || null,
            p_idempotency_key: lineIdempotencyKey,
            p_ip_address: null, // Browser can't access IP; use Edge Function if needed
            p_user_agent: navigator?.userAgent || null,
          });

          if (error) throw new Error(`Ошибка обработки платежа: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string; payment_id?: string };
          if (!result.success) throw new Error(result.error || 'Ошибка оплаты');

          console.log('[PaymentDialog] Payment processed successfully:', result.payment_id);
        }
      }

      paymentSuccess = true;

      // Reset form only on success (generates new idempotency key on next open)
      setLines([{ id: crypto.randomUUID(), method: 'cash', amount: '' }]);
      setNotes('');
      await fetchBalances(); // Refresh balances after successful payment
      onOpenChange(false);
      onPaymentComplete?.();
    } catch (err: any) {
      console.error('[PaymentDialog] Payment error:', err);
      alert(err.message || 'Произошла ошибка при обработке платежа');
      // Don't reset form on error - user can retry or fix amounts
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setLines([{ id: crypto.randomUUID(), method: 'cash', amount: '' }]);
      setNotes('');
      onOpenChange(false);
    }
  };

  const allMethods = [
    ...PAYMENT_METHODS,
    ...(bonusBalance > 0 ? ['bonus'] : []),
    ...(depositBalance > 0 ? ['deposit'] : []),
  ];

  const getMethodLabel = (m: string) => {
    if (m === 'bonus') return `Бонусы (${bonusBalance.toLocaleString('ru-RU')})`;
    if (m === 'deposit') return `Депозит (${depositBalance.toLocaleString('ru-RU')})`;
    return PAYMENT_METHOD_LABELS[m] ?? m;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Принять оплату</DialogTitle>
          <DialogDescription>
            Пациент: {patientName}
            {currentDebt > 0 && (
              <span className="block mt-1 text-destructive">
                Задолженность: {currentDebt.toLocaleString('ru-RU')} сум
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Quick balance info */}
        {!loadingBalances && (bonusBalance > 0 || depositBalance > 0) && (
          <div className="flex gap-2 flex-wrap">
            {bonusBalance > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Gift className="h-3 w-3" />
                Бонусы: <CurrencyDisplay amount={bonusBalance} size="sm" />
              </Badge>
            )}
            {depositBalance > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Wallet className="h-3 w-3" />
                Депозит: <CurrencyDisplay amount={depositBalance} size="sm" />
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment lines */}
          <div className="space-y-2">
            <Label>Способы оплаты</Label>
            {lines.map((line, idx) => (
              <div key={line.id} className="flex gap-2 items-center">
                <Select value={line.method} onValueChange={v => updateLine(line.id, 'method', v)} disabled={loading}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allMethods.map(m => (
                      <SelectItem key={m} value={m}>{getMethodLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Сумма"
                  value={line.amount}
                  onChange={(e) => updateLine(line.id, 'amount', e.target.value.replace(/[^\d\s,]/g, ''))}
                  disabled={loading}
                  className="flex-1"
                />
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={loading}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={loading}>
              <Plus className="h-3 w-3 mr-1" />Разделить оплату
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечание</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий к оплате"
              disabled={loading}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Итого:</span>
            <CurrencyDisplay amount={totalAmount} size="lg" className="font-bold" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || totalAmount <= 0}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Принять'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
