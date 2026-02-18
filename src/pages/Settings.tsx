import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, Users, CreditCard, Loader2, Clock, FileText, MessageCircle, Receipt, ClipboardList, Shield, HeartPulse } from 'lucide-react';
import { WorkScheduleSettings } from '@/components/settings/WorkScheduleSettings';
import { StaffManagement } from '@/components/settings/StaffManagement';
import { DocumentTemplatesSettings } from '@/components/settings/DocumentTemplatesSettings';
import { AssistantDoctorLinks } from '@/components/settings/AssistantDoctorLinks';
import { MessengerSettings } from '@/components/settings/MessengerSettings';
import { FiscalSettings } from '@/components/settings/FiscalSettings';
import { RoomManager } from '@/components/settings/RoomManager';
import { VisitTemplateManager } from '@/components/settings/VisitTemplateManager';
import { PermissionMatrix } from '@/components/settings/PermissionMatrix';
import { InsuranceCompanies } from '@/components/settings/InsuranceCompanies';

const Settings = () => {
  const { clinic, isClinicAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [clinicData, setClinicData] = useState({
    name: clinic?.name || '',
    phone: clinic?.phone || '',
    email: clinic?.email || '',
    address: clinic?.address || ''
  });

  const handleSaveClinic = async () => {
    if (!clinic?.id) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('clinics')
      .update({
        name: clinicData.name,
        phone: clinicData.phone,
        email: clinicData.email,
        address: clinicData.address
      })
      .eq('id', clinic.id);

    if (error) {
      toast.error('Ошибка сохранения');
    } else {
      toast.success('Настройки сохранены');
    }
    setIsLoading(false);
  };

  if (!isClinicAdmin) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-muted-foreground">Доступ только для администраторов клиники</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">Управление клиникой</p>
      </div>

      <Tabs defaultValue="clinic">
        <TabsList>
          <TabsTrigger value="clinic">
            <Building2 className="mr-2 h-4 w-4" />
            Клиника
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Clock className="mr-2 h-4 w-4" />
            График работы
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Команда
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Документы
          </TabsTrigger>
          <TabsTrigger value="messengers">
            <MessageCircle className="mr-2 h-4 w-4" />
            Мессенджеры
          </TabsTrigger>
          <TabsTrigger value="fiscal">
            <Receipt className="mr-2 h-4 w-4" />
            Фискализация
          </TabsTrigger>
          <TabsTrigger value="templates">
            <ClipboardList className="mr-2 h-4 w-4" />
            Шаблоны
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="mr-2 h-4 w-4" />
            Права
          </TabsTrigger>
          <TabsTrigger value="insurance">
            <HeartPulse className="mr-2 h-4 w-4" />
            Страховые
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Подписка
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация о клинике</CardTitle>
              <CardDescription>Основные данные вашей клиники</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название клиники</Label>
                  <Input
                    id="name"
                    value={clinicData.name}
                    onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={clinicData.phone}
                    onChange={(e) => setClinicData({ ...clinicData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={clinicData.email}
                  onChange={(e) => setClinicData({ ...clinicData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={clinicData.address}
                  onChange={(e) => setClinicData({ ...clinicData, address: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveClinic} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6 space-y-6">
          <WorkScheduleSettings />
          <RoomManager />
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-6">
          <StaffManagement />
          <AssistantDoctorLinks />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentTemplatesSettings />
        </TabsContent>

        <TabsContent value="messengers" className="mt-6">
          <MessengerSettings />
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <FiscalSettings />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <VisitTemplateManager />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="insurance" className="mt-6">
          <InsuranceCompanies />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Подписка</CardTitle>
              <CardDescription>Управление тарифом и оплатой</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Триальный период</p>
                    <p className="text-sm text-muted-foreground">14 дней бесплатно</p>
                  </div>
                  <Button variant="outline">Выбрать тариф</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
