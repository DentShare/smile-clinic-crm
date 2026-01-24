import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { formatCurrency } from '@/lib/formatters';

interface PatientFinanceSummaryProps {
  patientId: string;
  compact?: boolean;
  onSummaryLoaded?: (summary: any) => void;
}

export function PatientFinanceSummary({ 
  patientId, 
  compact = false,
  onSummaryLoaded 
}: PatientFinanceSummaryProps) {
  const { summary, loading, fetchSummary } = usePatientFinance(patientId);

  useEffect(() => {
    fetchSummary().then(s => {
      if (s && onSummaryLoaded) {
        onSummaryLoaded(s);
      }
    });
  }, [patientId, fetchSummary, onSummaryLoaded]);

  if (loading && !summary) {
    return compact ? (
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const hasDebt = summary.current_debt > 0;
  const hasAdvance = summary.advance > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {hasDebt && (
          <Badge variant="destructive" className="gap-1">
            <TrendingDown className="h-3 w-3" />
            Долг: {formatCurrency(summary.current_debt)}
          </Badge>
        )}
        {hasAdvance && (
          <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <TrendingUp className="h-3 w-3" />
            Аванс: {formatCurrency(summary.advance)}
          </Badge>
        )}
        {!hasDebt && !hasAdvance && (
          <Badge variant="outline" className="gap-1">
            <Wallet className="h-3 w-3" />
            Баланс: 0
          </Badge>
        )}
        {summary.planned_cost > 0 && (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            План: {formatCurrency(summary.planned_cost)}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Current Balance */}
      <Card className={hasDebt ? 'border-destructive/50' : hasAdvance ? 'border-emerald-500/50' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Баланс</CardTitle>
          {hasDebt ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Wallet className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${hasDebt ? 'text-destructive' : hasAdvance ? 'text-emerald-600' : ''}`}>
            {formatCurrency(summary.current_balance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasDebt ? 'Задолженность' : hasAdvance ? 'Аванс' : 'Нет долгов'}
          </p>
        </CardContent>
      </Card>

      {/* Total Paid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Оплачено</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.total_paid)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Всего платежей
          </p>
        </CardContent>
      </Card>

      {/* Treatment Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Услуги</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.total_treatment_cost)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Выполненные работы
          </p>
        </CardContent>
      </Card>

      {/* Planned Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">План</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatCurrency(summary.planned_cost)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Предстоящие работы
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
