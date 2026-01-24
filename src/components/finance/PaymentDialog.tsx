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
import { PaymentMethodSelector, PaymentSplit } from '@/components/ui/payment-method-selector';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { formatCurrency } from '@/lib/formatters';
import { Loader2, CreditCard } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentDebt?: number;
  appointmentId?: string;
  onPaymentComplete?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentDebt = 0,
  appointmentId,
  onPaymentComplete
}: PaymentDialogProps) {
  const { processPayment, loading } = usePatientFinance(patientId);
  const [amount, setAmount] = useState(currentDebt > 0 ? currentDebt.toString() : '');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [notes, setNotes] = useState('');
  const [fiscalUrl, setFiscalUrl] = useState('');

  const handleSubmit = async () => {
    const totalAmount = Number(amount);
    if (totalAmount <= 0) return;

    // If split payments, process each
    if (paymentSplits.length > 0) {
      for (const split of paymentSplits) {
        if (split.amount > 0) {
          await processPayment(patientId, split.amount, split.method, {
            appointmentId,
            fiscalCheckUrl: fiscalUrl || undefined,
            notes: notes || undefined
          });
        }
      }
    } else {
      // Single payment (default to cash)
      await processPayment(patientId, totalAmount, 'cash', {
        appointmentId,
        fiscalCheckUrl: fiscalUrl || undefined,
        notes: notes || undefined
      });
    }

    // Reset and close
    setAmount('');
    setPaymentSplits([]);
    setNotes('');
    setFiscalUrl('');
    onOpenChange(false);
    onPaymentComplete?.();
  };

  const suggestedAmounts = currentDebt > 0 
    ? [
        { label: 'Весь долг', value: currentDebt },
        { label: '50%', value: Math.round(currentDebt / 2) },
        { label: '100 000', value: 100000 },
        { label: '500 000', value: 500000 }
      ]
    : [
        { label: '100 000', value: 100000 },
        { label: '500 000', value: 500000 },
        { label: '1 000 000', value: 1000000 }
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Приём оплаты
          </DialogTitle>
          <DialogDescription>
            Пациент: {patientName}
            {currentDebt > 0 && (
              <span className="text-destructive"> • Долг: {formatCurrency(currentDebt)}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (сум)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
            />
            <div className="flex gap-2 flex-wrap">
              {suggestedAmounts.map(({ label, value }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(value.toString())}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            <PaymentMethodSelector
              totalAmount={Number(amount) || 0}
              value={paymentSplits}
              onChange={setPaymentSplits}
            />
          </div>

          {/* Fiscal receipt URL */}
          <div className="space-y-2">
            <Label htmlFor="fiscal">Ссылка на фискальный чек (опционально)</Label>
            <Input
              id="fiscal"
              type="url"
              placeholder="https://..."
              value={fiscalUrl}
              onChange={(e) => setFiscalUrl(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Примечание</Label>
            <Textarea
              id="notes"
              placeholder="Комментарий к платежу..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !amount || Number(amount) <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Обработка...
              </>
            ) : (
              `Принять ${amount ? formatCurrency(Number(amount)) : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
