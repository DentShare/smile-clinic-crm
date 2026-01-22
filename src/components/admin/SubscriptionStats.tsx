import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ru: string;
  price_monthly: number;
  subscribers: number;
  revenue: number;
}

interface ExpiringSubscription {
  clinic_name: string;
  plan_name: string;
  days_left: number;
  current_period_end: string;
}

const chartConfig = {
  starter: { label: 'Starter', color: 'hsl(var(--chart-1))' },
  professional: { label: 'Professional', color: 'hsl(var(--chart-2))' },
  enterprise: { label: 'Enterprise', color: 'hsl(var(--chart-3))' },
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const SubscriptionStats = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [expiring, setExpiring] = useState<ExpiringSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStats();
  }, []);

  const fetchSubscriptionStats = async () => {
    try {
      // Fetch subscription plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      // Fetch all subscriptions with clinic info
      const { data: subscriptions } = await supabase
        .from('clinic_subscriptions')
        .select(`
          plan_id,
          status,
          current_period_end,
          clinics (name)
        `);

      // Calculate stats per plan
      const planStats = plansData?.map((plan) => {
        const planSubs = subscriptions?.filter(
          (s: any) => s.plan_id === plan.id && s.status === 'active'
        );
        return {
          id: plan.id,
          name: plan.name,
          name_ru: plan.name_ru,
          price_monthly: Number(plan.price_monthly),
          subscribers: planSubs?.length || 0,
          revenue: (planSubs?.length || 0) * Number(plan.price_monthly),
        };
      }) || [];

      setPlans(planStats);

      // Find expiring subscriptions (within 7 days)
      const expiringList: ExpiringSubscription[] = [];
      subscriptions?.forEach((sub: any) => {
        if (sub.status === 'active' && sub.current_period_end) {
          const daysLeft = differenceInDays(new Date(sub.current_period_end), new Date());
          if (daysLeft <= 7 && daysLeft >= 0) {
            const plan = plansData?.find((p) => p.id === sub.plan_id);
            expiringList.push({
              clinic_name: sub.clinics?.name || 'Unknown',
              plan_name: plan?.name_ru || 'Unknown',
              days_left: daysLeft,
              current_period_end: sub.current_period_end,
            });
          }
        }
      });

      setExpiring(expiringList.sort((a, b) => a.days_left - b.days_left));
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = plans.map((plan) => ({
    name: plan.name_ru,
    value: plan.subscribers,
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Загрузка статистики...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Plans Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Распределение по планам</CardTitle>
          <CardDescription>Активные подписки по тарифным планам</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Revenue by Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Доход по планам</CardTitle>
          <CardDescription>Ежемесячный доход от каждого тарифного плана</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>План</TableHead>
                  <TableHead className="text-right">Подписчики</TableHead>
                  <TableHead className="text-right">Доход/мес</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan, index) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{plan.name_ru}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{plan.subscribers}</TableCell>
                    <TableCell className="text-right font-medium">
                      {plan.revenue.toLocaleString()} сум
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Итого</TableCell>
                  <TableCell className="text-right font-bold">
                    {plans.reduce((sum, p) => sum + p.subscribers, 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {plans.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()} сум
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Скоро истекают
            {expiring.length > 0 && (
              <Badge variant="destructive">{expiring.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Подписки, истекающие в ближайшие 7 дней
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Нет подписок, истекающих в ближайшие 7 дней
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиника</TableHead>
                    <TableHead>План</TableHead>
                    <TableHead>Дата окончания</TableHead>
                    <TableHead>Осталось дней</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiring.map((sub, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{sub.clinic_name}</TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>
                        {format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.days_left <= 3 ? 'destructive' : 'secondary'}>
                          {sub.days_left === 0 ? 'Сегодня' : `${sub.days_left} дн.`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionStats;
