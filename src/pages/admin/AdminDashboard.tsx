import { useState } from 'react';
import { useSuperAdminData } from '@/hooks/use-super-admin-data';
import { useAdminAlerts } from '@/hooks/use-admin-alerts';
import { useExcelExport } from '@/hooks/use-excel-export';
import { KPICards } from '@/components/admin/KPICards';
import { TenantsTable } from '@/components/admin/TenantsTable';
import { AcquisitionChart } from '@/components/admin/AcquisitionChart';
import MRRChart from '@/components/admin/MRRChart';
import SubscriptionStats from '@/components/admin/SubscriptionStats';
import { ClinicDetailDrawer } from '@/components/admin/ClinicDetailDrawer';
import { ExtendSubscriptionDialog } from '@/components/admin/ExtendSubscriptionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  RefreshCw, 
  AlertTriangle,
  Bell,
  Building2,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import type { ClinicTenant } from '@/types/superAdmin';

const AdminDashboard = () => {
  const { clinics, kpis, acquisitionData, loading, refresh } = useSuperAdminData();
  const { alerts } = useAdminAlerts();
  const { exportClinics, exportAlerts } = useExcelExport();
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [selectedClinic, setSelectedClinic] = useState<ClinicTenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [clinicToExtend, setClinicToExtend] = useState<ClinicTenant | null>(null);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  const handleSelectClinic = (clinic: ClinicTenant) => {
    setSelectedClinic(clinic);
    setDrawerOpen(true);
  };

  const handleLoginAsClinic = async (clinic: ClinicTenant) => {
    await startImpersonation(clinic.id);
    toast.success(`Просмотр клиники: ${clinic.name}`);
    navigate('/dashboard');
  };

  const handleExtendSubscription = (clinic: ClinicTenant) => {
    setClinicToExtend(clinic);
    setExtendDialogOpen(true);
  };

  const handleBlockClinic = async (clinic: ClinicTenant) => {
    try {
      const newStatus = !clinic.is_active;
      const { error } = await supabase
        .from('clinics')
        .update({ is_active: newStatus })
        .eq('id', clinic.id);
      if (error) throw error;
      toast.success(newStatus ? 'Клиника активирована' : 'Клиника приостановлена');
      refresh();
    } catch (error) {
      console.error('Error toggling clinic:', error);
      toast.error('Ошибка при изменении статуса');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Панель управления</h1>
          <p className="text-muted-foreground">Обзор платформы Dentelica</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => exportClinics(clinics)}>
            <Download className="h-4 w-4" />
            Экспорт Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {criticalAlerts.length} критических алертов требуют внимания
                  </p>
                  <p className="text-sm text-destructive/80">
                    {criticalAlerts.slice(0, 2).map(a => a.clinicName).join(', ')}
                    {criticalAlerts.length > 2 && ` и еще ${criticalAlerts.length - 2}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive/20"
                  onClick={() => exportAlerts(criticalAlerts)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Экспорт
                </Button>
                <Button variant="destructive" size="sm" asChild>
                  <Link to="/admin/alerts">
                    <Bell className="h-4 w-4 mr-1" />
                    Открыть алерты
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <KPICards kpis={kpis} />

      <Tabs defaultValue="clinics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clinics">
            <Building2 className="h-4 w-4 mr-2" />
            Клиники
            <Badge variant="secondary" className="ml-2">{clinics.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Аналитика
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinics" className="space-y-4">
          <TenantsTable 
            clinics={clinics} 
            onSelectClinic={handleSelectClinic}
            onLoginAsClinic={handleLoginAsClinic}
            onExtendSubscription={handleExtendSubscription}
            onBlockClinic={handleBlockClinic}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <MRRChart />
            <AcquisitionChart data={acquisitionData} />
          </div>
          <SubscriptionStats />
        </TabsContent>
      </Tabs>

      <ClinicDetailDrawer
        clinic={selectedClinic}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRefresh={refresh}
      />

      <ExtendSubscriptionDialog
        clinic={clinicToExtend}
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        onSuccess={refresh}
      />
    </div>
  );
};

export default AdminDashboard;
