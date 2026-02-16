import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/clientRuntime';

import { useSuperAdminData } from '@/hooks/use-super-admin-data';
import { KPICards } from '@/components/admin/KPICards';
import { TenantsTable } from '@/components/admin/TenantsTable';
import { AcquisitionChart } from '@/components/admin/AcquisitionChart';
import { ClinicDetailDrawer } from '@/components/admin/ClinicDetailDrawer';
import { ExtendSubscriptionDialog } from '@/components/admin/ExtendSubscriptionDialog';
import MRRChart from '@/components/admin/MRRChart';
import type { ClinicTenant } from '@/types/superAdmin';

const SuperAdminDashboard = () => {
  const { clinics, kpis, acquisitionData, loading, refresh } = useSuperAdminData();
  
  const [selectedClinic, setSelectedClinic] = useState<ClinicTenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendClinic, setExtendClinic] = useState<ClinicTenant | null>(null);

  const handleSelectClinic = (clinic: ClinicTenant) => {
    setSelectedClinic(clinic);
    setDrawerOpen(true);
  };

  const handleLoginAsClinic = (clinic: ClinicTenant) => {
    // TODO: Implement impersonation feature
    toast.info(`Функция "Войти как клиника" в разработке`);
  };

  const handleExtendSubscription = (clinic: ClinicTenant) => {
    setExtendClinic(clinic);
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
      
      toast.success(newStatus ? 'Клиника разблокирована' : 'Клиника заблокирована');
      refresh();
    } catch (error) {
      console.error('Error blocking clinic:', error);
      toast.error('Ошибка при изменении статуса');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
          <p className="text-muted-foreground">Управление платформой Dentelica</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* KPI Cards */}
      <KPICards kpis={kpis} loading={loading} />

      {/* Main Content */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Клиники</TabsTrigger>
          <TabsTrigger value="acquisition">Маркетинг</TabsTrigger>
          <TabsTrigger value="mrr">MRR Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <TenantsTable
            clinics={clinics}
            onSelectClinic={handleSelectClinic}
            onLoginAsClinic={handleLoginAsClinic}
            onExtendSubscription={handleExtendSubscription}
            onBlockClinic={handleBlockClinic}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="acquisition">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AcquisitionChart data={acquisitionData} loading={loading} />
            <MRRChart />
          </div>
        </TabsContent>

        <TabsContent value="mrr">
          <MRRChart />
        </TabsContent>
      </Tabs>

      {/* Clinic Detail Drawer */}
      <ClinicDetailDrawer
        clinic={selectedClinic}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRefresh={refresh}
      />

      {/* Extend Subscription Dialog */}
      <ExtendSubscriptionDialog
        clinic={extendClinic}
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        onSuccess={refresh}
      />
    </div>
  );
};

export default SuperAdminDashboard;
