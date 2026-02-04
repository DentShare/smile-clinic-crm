import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { CreditCard, Wallet } from 'lucide-react';

interface PatientWalletCardProps {
  patientId: string;
  compact?: boolean;
  onPaymentClick?: () => void;
}

export function PatientWalletCard({ patientId, compact = false, onPaymentClick }: PatientWalletCardProps) {
  const {
    financialState,
    loading,
    fetchFinancialState,
    summary,
  } = usePatientFinance(patientId);

  useEffect(() => {
    if (patientId) {
      fetchFinancialState(patientId);
    }
  }, [patientId, fetchFinancialState]);

  if (loading && !financialState) {
    return (
      <div className="animate-pulse rounded-lg bg-muted h-20" />
    );
  }

  const balance = summary?.current_balance ?? 0;
  const isDebt = balance < 0;
  const isAdvance = balance > 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Баланс</span>
          <CurrencyDisplay
            amount={Math.abs(balance)}
            size="sm"
            className={isDebt ? 'text-destructive font-medium' : isAdvance ? 'text-success font-medium' : ''}
          />
        </div>
        {isDebt && (
          <p className="text-xs text-muted-foreground">Задолженность</p>
        )}
        {isAdvance && (
          <p className="text-xs text-muted-foreground">Аванс</p>
        )}
        {onPaymentClick && (
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={onPaymentClick}>
            <CreditCard className="h-4 w-4" />
            Принять оплату
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Финансы</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Оплачено</span>
            <CurrencyDisplay amount={summary?.total_paid ?? 0} size="sm" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Услуги</span>
            <CurrencyDisplay amount={summary?.total_treatment_cost ?? 0} size="sm" />
          </div>
          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Баланс</span>
            <CurrencyDisplay
              amount={Math.abs(balance)}
              size="sm"
              className={isDebt ? 'text-destructive' : isAdvance ? 'text-success' : ''}
            />
          </div>
          {onPaymentClick && (
            <Button size="sm" variant="outline" className="w-full mt-2 gap-2" onClick={onPaymentClick}>
              <CreditCard className="h-4 w-4" />
              Принять оплату
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
