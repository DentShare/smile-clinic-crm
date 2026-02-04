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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-methods';
import { Loader2 } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentDebt: number;
  onPaymentComplete?: () => void;
}

const PAYMENT_METHODS = ['cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer'];

export function PaymentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentDebt,
  onPaymentComplete,
}: PaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const { processPayment, loading } = usePatientFinance(patientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return;

    const result = await processPayment(patientId, numAmount, method, { notes });
    if (result.success) {
      setAmount('');
      setNotes('');
      onOpenChange(false);
      onPaymentComplete?.();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount('');
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (сум)</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d\s,]/g, ''))}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">Способ оплаты</Label>
            <Select value={method} onValueChange={setMethod} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m] ?? m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Примечание (опционально)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий к оплате"
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !amount || parseFloat(amount.replace(/\s/g, '')) <= 0}>
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
