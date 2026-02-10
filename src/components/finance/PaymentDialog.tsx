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
    { id: '1', method: 'cash', amount: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
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
    setLines(prev => [...prev, { id: Date.now().toString(), method: 'cash', amount: '' }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: 'method' | 'amount', value: string) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const parseAmount = (str: string) => {
    const num = parseFloat(str.replace(/\s/g, '').replace(',', '.'));
    return isNaN(num) || num <= 0 ? 0 : num;
  };

  const totalAmount = lines.reduce((sum, l) => sum + parseAmount(l.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) return;

    setLoading(true);
    try {
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
          if (error) throw error;
          const result = data as unknown as { success: boolean; error?: string };
          if (!result.success) throw new Error(result.error || 'Ошибка списания бонусов');
        } else if (line.method === 'deposit') {
          const { data, error } = await supabase.rpc('process_deposit_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_deducted_by: profile?.id || null,
          });
          if (error) throw error;
          const result = data as unknown as { success: boolean; error?: string };
          if (!result.success) throw new Error(result.error || 'Ошибка списания с депозита');
        } else {
          const result = await processPayment(patientId, amt, line.method, { notes });
          if (!result.success) throw new Error(result.error || 'Ошибка оплаты');
        }
      }

      setLines([{ id: '1', method: 'cash', amount: '' }]);
      setNotes('');
      onOpenChange(false);
      onPaymentComplete?.();
    } catch (err: any) {
      // Toast is already shown by processPayment
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setLines([{ id: '1', method: 'cash', amount: '' }]);
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
