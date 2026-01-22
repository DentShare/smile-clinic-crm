import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, MoreHorizontal, Ban, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Clinic {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  subscription?: {
    status: string;
    plan_name: string;
    current_period_end: string | null;
  };
}

interface ClinicsManagementProps {
  onUpdate: () => void;
}

const ClinicsManagement = ({ onUpdate }: ClinicsManagementProps) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [dialogAction, setDialogAction] = useState<'block' | 'unblock' | null>(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (clinicsError) throw clinicsError;

      // Fetch subscriptions for each clinic
      const { data: subscriptionsData } = await supabase
        .from('clinic_subscriptions')
        .select(`
          clinic_id,
          status,
          current_period_end,
          subscription_plans (name)
        `);

      const clinicsWithSubs = clinicsData?.map((clinic) => {
        const sub = subscriptionsData?.find((s: any) => s.clinic_id === clinic.id);
        return {
          ...clinic,
          subscription: sub
            ? {
                status: sub.status,
                plan_name: (sub as any).subscription_plans?.name || 'Unknown',
                current_period_end: sub.current_period_end,
              }
            : undefined,
        };
      });

      setClinics(clinicsWithSubs || []);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      toast.error('Ошибка загрузки клиник');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedClinic) return;

    const newStatus = dialogAction === 'unblock';

    try {
      const { error } = await supabase
        .from('clinics')
        .update({ is_active: newStatus })
        .eq('id', selectedClinic.id);

      if (error) throw error;

      toast.success(
        newStatus
          ? `Клиника "${selectedClinic.name}" разблокирована`
          : `Клиника "${selectedClinic.name}" заблокирована`
      );

      fetchClinics();
      onUpdate();
    } catch (error) {
      console.error('Error updating clinic:', error);
      toast.error('Ошибка обновления статуса клиники');
    } finally {
      setSelectedClinic(null);
      setDialogAction(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Активна</Badge>;
      case 'trial':
        return <Badge variant="secondary">Пробный период</Badge>;
      case 'expired':
        return <Badge variant="destructive">Просрочена</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Отменена</Badge>;
      default:
        return <Badge variant="outline">Нет подписки</Badge>;
    }
  };

  const filteredClinics = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Загрузка клиник...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Управление клиниками</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск клиник..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Поддомен</TableHead>
                  <TableHead>Подписка</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'Клиники не найдены' : 'Нет зарегистрированных клиник'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClinics.map((clinic) => (
                    <TableRow key={clinic.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{clinic.name}</p>
                          {clinic.email && (
                            <p className="text-sm text-muted-foreground">{clinic.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{clinic.subdomain}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(clinic.subscription?.status)}
                          {clinic.subscription?.plan_name && (
                            <p className="text-xs text-muted-foreground">
                              {clinic.subscription.plan_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {clinic.is_active ? (
                          <Badge variant="outline" className="text-chart-2 border-chart-2">
                            Активна
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Заблокирована</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(clinic.created_at), 'dd MMM yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Подробнее
                            </DropdownMenuItem>
                            {clinic.is_active ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedClinic(clinic);
                                  setDialogAction('block');
                                }}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Заблокировать
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedClinic(clinic);
                                  setDialogAction('unblock');
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Разблокировать
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'block' ? 'Заблокировать клинику?' : 'Разблокировать клинику?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'block'
                ? `Клиника "${selectedClinic?.name}" будет заблокирована. Пользователи не смогут войти в систему.`
                : `Клиника "${selectedClinic?.name}" будет разблокирована. Пользователи снова получат доступ.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={dialogAction === 'block' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {dialogAction === 'block' ? 'Заблокировать' : 'Разблокировать'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClinicsManagement;
