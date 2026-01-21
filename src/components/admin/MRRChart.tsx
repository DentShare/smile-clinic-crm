import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MRRDataPoint {
  month: string;
  mrr: number;
  subscriptions: number;
}

const chartConfig = {
  mrr: {
    label: 'MRR',
    color: 'hsl(var(--chart-1))',
  },
  subscriptions: {
    label: 'Подписки',
    color: 'hsl(var(--chart-2))',
  },
};

const MRRChart = () => {
  const [data, setData] = useState<MRRDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMRR, setCurrentMRR] = useState(0);
  const [growth, setGrowth] = useState(0);

  useEffect(() => {
    fetchMRRData();
  }, []);

  const fetchMRRData = async () => {
    try {
      // Get billing history for the last 6 months
      const { data: billingData } = await supabase
        .from('billing_history')
        .select('amount, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', subMonths(new Date(), 6).toISOString())
        .order('created_at', { ascending: true });

      // Get current subscriptions for MRR calculation
      const { data: subscriptions } = await supabase
        .from('clinic_subscriptions')
        .select(`
          status,
          created_at,
          subscription_plans (price_monthly)
        `);

      // Calculate current MRR
      let totalMRR = 0;
      subscriptions?.forEach((sub: any) => {
        if (sub.status === 'active') {
          totalMRR += Number(sub.subscription_plans?.price_monthly || 0);
        }
      });
      setCurrentMRR(totalMRR);

      // Generate monthly data points
      const monthlyData: MRRDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        // Count subscriptions created before this month end
        const activeSubscriptions = subscriptions?.filter((sub: any) => {
          const createdAt = new Date(sub.created_at);
          return createdAt <= monthEnd && (sub.status === 'active' || sub.status === 'trial');
        }).length || 0;

        // Calculate MRR for this month (simplified)
        const monthMRR = subscriptions
          ?.filter((sub: any) => {
            const createdAt = new Date(sub.created_at);
            return createdAt <= monthEnd && sub.status === 'active';
          })
          .reduce((sum: number, sub: any) => {
            return sum + Number(sub.subscription_plans?.price_monthly || 0);
          }, 0) || 0;

        monthlyData.push({
          month: format(monthDate, 'MMM', { locale: ru }),
          mrr: monthMRR,
          subscriptions: activeSubscriptions,
        });
      }

      setData(monthlyData);

      // Calculate growth
      if (monthlyData.length >= 2) {
        const lastMonth = monthlyData[monthlyData.length - 2].mrr;
        const thisMonth = monthlyData[monthlyData.length - 1].mrr;
        if (lastMonth > 0) {
          setGrowth(((thisMonth - lastMonth) / lastMonth) * 100);
        }
      }
    } catch (error) {
      console.error('Error fetching MRR data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Загрузка данных...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Текущий MRR</CardDescription>
            <CardTitle className="text-3xl">{currentMRR.toLocaleString()} сум</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Рост за месяц</CardDescription>
            <CardTitle className={`text-3xl ${growth >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ARR (годовой)</CardDescription>
            <CardTitle className="text-3xl">{(currentMRR * 12).toLocaleString()} сум</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика MRR</CardTitle>
          <CardDescription>Monthly Recurring Revenue за последние 6 месяцев</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${value.toLocaleString()} сум`, 'MRR']}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#mrrGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default MRRChart;
