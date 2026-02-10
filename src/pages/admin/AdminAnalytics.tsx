import { useSuperAdminData } from '@/hooks/use-super-admin-data';
import { AcquisitionChart } from '@/components/admin/AcquisitionChart';
import MRRChart from '@/components/admin/MRRChart';
import SubscriptionStats from '@/components/admin/SubscriptionStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, Building2, Calendar } from 'lucide-react';
import { useMemo } from 'react';
import { ChartContainer } from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

const AdminAnalytics = () => {
  const { clinics, kpis, acquisitionData, loading, refresh } = useSuperAdminData();

  const newSignupsLast30 = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return clinics.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
  }, [clinics]);

  const growthData = useMemo(() => {
    const months: { month: string; clinics: number; cumulative: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const newInMonth = clinics.filter(c =>
        isWithinInterval(new Date(c.created_at), { start: monthStart, end: monthEnd })
      ).length;
      const cumulative = clinics.filter(c => new Date(c.created_at) <= monthEnd).length;
      months.push({ month: format(monthDate, 'MMM yy', { locale: ru }), clinics: newInMonth, cumulative });
    }
    return months;
  }, [clinics]);

  const chartConfig = {
    clinics: { label: 'Новые клиники', color: 'hsl(var(--primary))' },
    cumulative: { label: 'Всего клиник', color: 'hsl(var(--chart-2))' },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Аналитика</h1>
          <p className="text-muted-foreground">Обзор ключевых метрик платформы</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{kpis.totalClinics}</p>
              <p className="text-sm text-muted-foreground">Всего клиник</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-2/10">
              <TrendingUp className="h-6 w-6 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{kpis.mrr.toLocaleString('ru-RU')} сум</p>
              <p className="text-sm text-muted-foreground">MRR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-4/10">
              <Users className="h-6 w-6 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{newSignupsLast30}</p>
              <p className="text-sm text-muted-foreground">Новых за 30 дней</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Рост клиник
          </CardTitle>
          <CardDescription>Динамика регистрации новых клиник за 12 месяцев</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="clinics" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Новые клиники" />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Всего клиник" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <MRRChart />
        <AcquisitionChart data={acquisitionData} />
      </div>

      <SubscriptionStats />
    </div>
  );
};

export default AdminAnalytics;
