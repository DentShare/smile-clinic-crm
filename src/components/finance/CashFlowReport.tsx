import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { useExcelExport } from '@/hooks/use-excel-export';
import { formatCurrency } from '@/lib/formatters';
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-methods';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Download, TrendingUp, TrendingDown, ArrowRightLeft, Loader2 } from 'lucide-react';

type Period = 'week' | 'month' | 'quarter' | 'year';

interface CashFlowData {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export function CashFlowReport() {
  const { clinic } = useAuth();
  const { exportRevenueReport } = useExcelExport();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<CashFlowData[]>([]);
  const [totals, setTotals] = useState({ income: 0, expenses: 0, net: 0 });
  const [incomeByMethod, setIncomeByMethod] = useState<{ method: string; amount: number }[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<{ name: string; amount: number }[]>([]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week': return { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  useEffect(() => {
    if (clinic?.id) fetchData();
  }, [clinic?.id, period]);

  const fetchData = async () => {
    if (!clinic?.id) return;
    setLoading(true);

    const { start, end } = getDateRange();

    const [paymentsRes, expensesRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, payment_method, created_at')
        .eq('clinic_id', clinic.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabase
        .from('expenses')
        .select('amount, date, category:expense_categories(name)')
        .eq('clinic_id', clinic.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd')),
    ]);

    const payments = paymentsRes.data || [];
    const expenses = expensesRes.data || [];

    // Totals
    const totalIncome = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    setTotals({ income: totalIncome, expenses: totalExpenses, net: totalIncome - totalExpenses });

    // Income by method
    const methodMap: Record<string, number> = {};
    payments.forEach(p => {
      const m = p.payment_method || 'cash';
      methodMap[m] = (methodMap[m] || 0) + Number(p.amount);
    });
    setIncomeByMethod(
      Object.entries(methodMap)
        .map(([method, amount]) => ({ method, amount }))
        .sort((a, b) => b.amount - a.amount)
    );

    // Expenses by category
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
      const name = (e.category as any)?.name || 'Без категории';
      catMap[name] = (catMap[name] || 0) + Number(e.amount);
    });
    setExpenseByCategory(
      Object.entries(catMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    );

    // Chart data by intervals
    const intervals = period === 'week' || period === 'month'
      ? eachDayOfInterval({ start, end })
      : period === 'quarter'
        ? eachWeekOfInterval({ start, end })
        : eachMonthOfInterval({ start, end });

    const chart: CashFlowData[] = intervals.map((d, i) => {
      const intervalStart = d;
      const intervalEnd = i < intervals.length - 1 ? intervals[i + 1] : end;
      const dayEnd = new Date(intervalEnd);
      if (i < intervals.length - 1) dayEnd.setMilliseconds(-1);
      else dayEnd.setHours(23, 59, 59, 999);

      const dayIncome = payments
        .filter(p => p.created_at && isWithinInterval(new Date(p.created_at), { start: intervalStart, end: dayEnd }))
        .reduce((s, p) => s + Number(p.amount), 0);

      const dayExpense = expenses
        .filter(e => {
          const ed = new Date(e.date + 'T12:00:00');
          return isWithinInterval(ed, { start: intervalStart, end: dayEnd });
        })
        .reduce((s, e) => s + Number(e.amount), 0);

      const label = period === 'year'
        ? format(d, 'LLL', { locale: ru })
        : period === 'quarter'
          ? format(d, 'dd.MM', { locale: ru })
          : format(d, 'dd.MM', { locale: ru });

      return { label, income: dayIncome, expenses: dayExpense, net: dayIncome - dayExpense };
    });

    setChartData(chart);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Отчёт о движении денежных средств (ДДС)</h2>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="quarter">Квартал</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => exportRevenueReport(chartData.map(d => ({ date: d.label, income: d.income, charges: d.expenses })))}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Доходы</span>
            </div>
            <CurrencyDisplay amount={totals.income} size="lg" className="text-success font-bold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Расходы</span>
            </div>
            <CurrencyDisplay amount={totals.expenses} size="lg" className="text-destructive font-bold" />
          </CardContent>
        </Card>
        <Card className={totals.net >= 0 ? 'border-success/50' : 'border-destructive/50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Чистый денежный поток</span>
            </div>
            <CurrencyDisplay
              amount={totals.net}
              size="lg"
              className={`font-bold ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Динамика денежного потока</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Доходы' : name === 'expenses' ? 'Расходы' : 'Чистый поток']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend formatter={(value) => value === 'income' ? 'Доходы' : value === 'expenses' ? 'Расходы' : 'Чистый поток'} />
                <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Income by method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Доходы по способам оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByMethod.length > 0 ? (
              <div className="space-y-3">
                {incomeByMethod.map((item) => (
                  <div key={item.method} className="flex items-center justify-between">
                    <span className="text-sm">{PAYMENT_METHOD_LABELS[item.method] || item.method}</span>
                    <CurrencyDisplay amount={item.amount} className="text-success" />
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span className="text-sm">Итого</span>
                  <CurrencyDisplay amount={totals.income} className="text-success font-bold" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Expenses by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Расходы по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <div className="space-y-3">
                {expenseByCategory.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <CurrencyDisplay amount={item.amount} className="text-destructive" />
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive/70 rounded-full"
                        style={{ width: `${totals.expenses > 0 ? (item.amount / totals.expenses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span className="text-sm">Итого</span>
                  <CurrencyDisplay amount={totals.expenses} className="text-destructive font-bold" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Нет расходов</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
