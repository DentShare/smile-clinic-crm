import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import {
  Loader2,
  TrendingUp,
  Users,
  AlertTriangle,
  FileText,
  Phone,
  Target,
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';

interface IncomeData {
  date: string;
  income: number;
  expenses: number;
}

interface DebtorInfo {
  id: string;
  full_name: string;
  phone: string;
  balance: number;
  last_visit?: string;
  last_payment?: string;
}

interface ForecastData {
  planned_total: number;
  active_plans_count: number;
  by_month: { month: string; amount: number }[];
  by_service: { name: string; amount: number; count: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Finance = () => {
  const { clinic } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | '3months'>('month');
  
  // Data states
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [debtors, setDebtors] = useState<DebtorInfo[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalDebt: 0,
    debtorsCount: 0,
    avgPayment: 0,
    paymentMethodStats: [] as { method: string; amount: number; count: number }[]
  });

  useEffect(() => {
    if (clinic?.id) {
      fetchAllData();
    }
  }, [clinic?.id, period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchAllData = async () => {
    if (!clinic?.id) return;
    setIsLoading(true);

    try {
      const { start, end } = getDateRange();

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, payment_method, created_at')
        .eq('clinic_id', clinic.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      // Fetch performed works (expenses)
      const { data: worksData } = await supabase
        .from('performed_works')
        .select('id, total, created_at')
        .eq('clinic_id', clinic.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      // Process income by day
      const days = eachDayOfInterval({ start, end });
      const incomeByDay = days.map(day => {
        const dayStr = format(day, 'dd.MM');
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayPayments = paymentsData?.filter(p => 
          isWithinInterval(new Date(p.created_at), { start: dayStart, end: dayEnd })
        ) || [];
        
        const dayWorks = worksData?.filter(w => 
          isWithinInterval(new Date(w.created_at), { start: dayStart, end: dayEnd })
        ) || [];

        return {
          date: dayStr,
          income: dayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          expenses: dayWorks.reduce((sum, w) => sum + Number(w.total), 0)
        };
      });

      setIncomeData(incomeByDay);

      // Calculate stats
      const totalIncome = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalExpenses = worksData?.reduce((sum, w) => sum + Number(w.total), 0) || 0;
      const avgPayment = paymentsData?.length ? totalIncome / paymentsData.length : 0;

      // Payment method stats
      const methodStats: Record<string, { amount: number; count: number }> = {};
      paymentsData?.forEach(p => {
        const method = p.payment_method || 'cash';
        if (!methodStats[method]) methodStats[method] = { amount: 0, count: 0 };
        methodStats[method].amount += Number(p.amount);
        methodStats[method].count += 1;
      });

      const paymentMethodStats = Object.entries(methodStats).map(([method, data]) => ({
        method,
        ...data
      }));

      // Fetch debtors (patients with negative balance)
      const { data: debtorsData } = await supabase
        .from('patients')
        .select('id, full_name, phone, balance')
        .eq('clinic_id', clinic.id)
        .lt('balance', 0)
        .order('balance', { ascending: true })
        .limit(50);

      const totalDebt = debtorsData?.reduce((sum, d) => sum + Math.abs(Number(d.balance)), 0) || 0;

      setDebtors(debtorsData?.map(d => ({
        id: d.id,
        full_name: d.full_name,
        phone: d.phone,
        balance: Number(d.balance)
      })) || []);

      setStats({
        totalIncome,
        totalExpenses,
        totalDebt,
        debtorsCount: debtorsData?.length || 0,
        avgPayment,
        paymentMethodStats
      });

      // Fetch forecast from treatment plans
      const { data: plansData } = await supabase
        .from('treatment_plans')
        .select(`
          id, total_price, status,
          stages:treatment_plan_stages(
            id, estimated_price, status,
            items:treatment_plan_items(id, service_name, total_price, is_completed)
          )
        `)
        .eq('clinic_id', clinic.id)
        .in('status', ['draft', 'active']);

      // Calculate forecast
      let plannedTotal = 0;
      const serviceMap: Record<string, { amount: number; count: number }> = {};

      plansData?.forEach((plan: any) => {
        plan.stages?.forEach((stage: any) => {
          stage.items?.filter((item: any) => !item.is_completed).forEach((item: any) => {
            plannedTotal += Number(item.total_price);
            const name = item.service_name;
            if (!serviceMap[name]) serviceMap[name] = { amount: 0, count: 0 };
            serviceMap[name].amount += Number(item.total_price);
            serviceMap[name].count += 1;
          });
        });
      });

      const byService = Object.entries(serviceMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      setForecast({
        planned_total: plannedTotal,
        active_plans_count: plansData?.length || 0,
        by_month: [],
        by_service: byService
      });

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Наличные',
    card_terminal: 'Терминал',
    uzcard: 'UzCard',
    humo: 'Humo',
    visa: 'Visa',
    mastercard: 'MasterCard',
    click: 'Click',
    payme: 'Payme',
    uzum: 'Uzum',
    bank_transfer: 'Перевод'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Финансы</h1>
          <p className="text-muted-foreground">Доходы, должники и прогноз выручки</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Эта неделя</SelectItem>
            <SelectItem value="month">Этот месяц</SelectItem>
            <SelectItem value="3months">3 месяца</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доход</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <CurrencyDisplay amount={stats.totalIncome} size="lg" className="text-success" />
            <p className="text-xs text-muted-foreground mt-1">
              за выбранный период
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оказано услуг</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <CurrencyDisplay amount={stats.totalExpenses} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              стоимость работ
            </p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий долг</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <CurrencyDisplay amount={stats.totalDebt} size="lg" className="text-destructive" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.debtorsCount} должников
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прогноз</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <CurrencyDisplay amount={forecast?.planned_total || 0} size="lg" className="text-primary" />
            <p className="text-xs text-muted-foreground mt-1">
              {forecast?.active_plans_count || 0} активных планов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Доходы
          </TabsTrigger>
          <TabsTrigger value="debtors" className="gap-2">
            <Users className="h-4 w-4" />
            Должники
            {stats.debtorsCount > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.debtorsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2">
            <Target className="h-4 w-4" />
            Прогноз
          </TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Income Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Динамика доходов</CardTitle>
                <CardDescription>Оплаты vs Оказанные услуги</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={incomeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        className="text-xs"
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Дата: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stackId="1"
                        stroke="hsl(var(--success))" 
                        fill="hsl(var(--success))"
                        fillOpacity={0.3}
                        name="Оплаты"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        stackId="2"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        name="Услуги"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Способы оплаты</CardTitle>
                <CardDescription>Распределение по методам</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.paymentMethodStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="amount"
                        nameKey="method"
                      >
                        {stats.paymentMethodStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {stats.paymentMethodStats.map((method, i) => (
                    <div key={method.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span>{paymentMethodLabels[method.method] || method.method}</span>
                      </div>
                      <span className="text-muted-foreground">{method.count} оплат</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Debtors Tab */}
        <TabsContent value="debtors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Должники
              </CardTitle>
              <CardDescription>
                Пациенты с задолженностью • Общий долг: {formatCurrency(stats.totalDebt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {debtors.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Нет пациентов с задолженностью</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пациент</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead className="text-right">Долг</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debtors.map((debtor) => (
                        <TableRow key={debtor.id}>
                          <TableCell>
                            <Link 
                              to={`/patients/${debtor.id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {debtor.full_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`tel:${debtor.phone}`} 
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="h-3 w-3" />
                              {debtor.phone}
                            </a>
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay 
                              amount={Math.abs(debtor.balance)} 
                              className="text-destructive font-medium" 
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/patients/${debtor.id}`}>
                                Открыть
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Прогноз выручки
                </CardTitle>
                <CardDescription>
                  На основе активных планов лечения
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Ожидаемая выручка</p>
                    <CurrencyDisplay 
                      amount={forecast?.planned_total || 0} 
                      size="lg" 
                      className="text-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      из {forecast?.active_plans_count || 0} активных планов лечения
                    </p>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Прогноз строится на основе незавершённых позиций в планах лечения со статусами "черновик" и "активный".</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Популярные услуги</CardTitle>
                <CardDescription>В планах лечения</CardDescription>
              </CardHeader>
              <CardContent>
                {forecast?.by_service && forecast.by_service.length > 0 ? (
                  <div className="space-y-3">
                    {forecast.by_service.map((service, i) => (
                      <div key={service.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{service.name}</span>
                          <span className="text-muted-foreground ml-2">{service.count}×</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(service.amount / (forecast.planned_total || 1)) * 100}%`,
                                backgroundColor: COLORS[i % COLORS.length]
                              }}
                            />
                          </div>
                          <CurrencyDisplay amount={service.amount} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Нет запланированных услуг</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
