import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, DollarSign, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import ClinicsManagement from '@/components/admin/ClinicsManagement';
import MRRChart from '@/components/admin/MRRChart';
import SubscriptionStats from '@/components/admin/SubscriptionStats';

interface DashboardStats {
  totalClinics: number;
  activeSubscriptions: number;
  trialClinics: number;
  expiredClinics: number;
  mrr: number;
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClinics: 0,
    activeSubscriptions: 0,
    trialClinics: 0,
    expiredClinics: 0,
    mrr: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch clinics count
      const { count: clinicsCount } = await supabase
        .from('clinics')
        .select('*', { count: 'exact', head: true });

      // Fetch subscriptions with their plans
      const { data: subscriptions } = await supabase
        .from('clinic_subscriptions')
        .select(`
          status,
          plan_id,
          subscription_plans (price_monthly)
        `);

      let activeCount = 0;
      let trialCount = 0;
      let expiredCount = 0;
      let monthlyRevenue = 0;

      subscriptions?.forEach((sub: any) => {
        if (sub.status === 'active') {
          activeCount++;
          monthlyRevenue += Number(sub.subscription_plans?.price_monthly || 0);
        } else if (sub.status === 'trial') {
          trialCount++;
        } else if (sub.status === 'expired' || sub.status === 'cancelled') {
          expiredCount++;
        }
      });

      setStats({
        totalClinics: clinicsCount || 0,
        activeSubscriptions: activeCount,
        trialClinics: trialCount,
        expiredClinics: expiredCount,
        mrr: monthlyRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Всего клиник',
      value: stats.totalClinics,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'MRR',
      value: `${stats.mrr.toLocaleString()} сум`,
      icon: DollarSign,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Активные подписки',
      value: stats.activeSubscriptions,
      icon: TrendingUp,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    {
      title: 'На пробном периоде',
      value: stats.trialClinics,
      icon: Users,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
    {
      title: 'Просроченные',
      value: stats.expiredClinics,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Панель Super Admin</h1>
        <p className="text-muted-foreground">Управление платформой DentaClinic</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="clinics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clinics">Клиники</TabsTrigger>
          <TabsTrigger value="mrr">MRR Аналитика</TabsTrigger>
          <TabsTrigger value="subscriptions">Подписки</TabsTrigger>
        </TabsList>

        <TabsContent value="clinics">
          <ClinicsManagement onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="mrr">
          <MRRChart />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionStats />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
