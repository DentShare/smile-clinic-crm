import { useState } from 'react';
import { useSuperAdminData } from '@/hooks/use-super-admin-data';
import { TenantsTable } from '@/components/admin/TenantsTable';
import { ClinicDetailDrawer } from '@/components/admin/ClinicDetailDrawer';
import { ExtendSubscriptionDialog } from '@/components/admin/ExtendSubscriptionDialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { useExcelExport } from '@/hooks/use-excel-export';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/clientRuntime';
import type { ClinicTenant } from '@/types/superAdmin';

const AdminClinics = () => {
  const { clinics, loading, refresh } = useSuperAdminData();
  const { exportClinics } = useExcelExport();
  const [selectedClinic, setSelectedClinic] = useState<ClinicTenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [clinicToExtend, setClinicToExtend] = useState<ClinicTenant | null>(null);

  const handleSelectClinic = (clinic: ClinicTenant) => {
    setSelectedClinic(clinic);
    setDrawerOpen(true);
  };

  const handleLoginAsClinic = (_clinic: ClinicTenant) => {
    toast.info('Функция "Войти как клиника" в разработке');
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Клиники</h1>
          <p className="text-slate-400">Управление зарегистрированными клиниками</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 border-slate-600 text-slate-300"
            onClick={() => exportClinics(clinics)}
          >
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-slate-600 text-slate-300"
            onClick={() => refresh()}
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>
      </div>

      <TenantsTable
        clinics={clinics}
        onSelectClinic={handleSelectClinic}
        onLoginAsClinic={handleLoginAsClinic}
        onExtendSubscription={handleExtendSubscription}
        onBlockClinic={handleBlockClinic}
        loading={loading}
      />

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

export default AdminClinics;
