import { useState } from 'react';
import { useSuperAdminData } from '@/hooks/use-super-admin-data';
import SubscriptionStats from '@/components/admin/SubscriptionStats';
import { ExtendSubscriptionDialog } from '@/components/admin/ExtendSubscriptionDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RefreshCw, Calendar, CreditCard, Search } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ClinicTenant } from '@/types/superAdmin';

const AdminSubscriptions = () => {
  const { clinics, refresh } = useSuperAdminData();
  const [search, setSearch] = useState('');
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [clinicToExtend, setClinicToExtend] = useState<ClinicTenant | null>(null);

  const filteredClinics = clinics.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.owner_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getDaysRemaining = (endDate: string | null | undefined) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Подписки</h1>
          <p className="text-muted-foreground">Управление подписками и тарифами клиник</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4" />
          Обновить
        </Button>
      </div>

      <SubscriptionStats />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Активные тарифы
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Поиск клиники..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клиника</TableHead>
                  <TableHead>План</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Оплачено до</TableHead>
                  <TableHead>Осталось дней</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map((clinic) => {
                  const daysLeft = getDaysRemaining(clinic.subscription?.current_period_end);
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  return (
                    <TableRow key={clinic.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{clinic.name}</p>
                          <p className="text-xs text-muted-foreground">{clinic.subdomain}.dent-crm.uz</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{clinic.subscription?.plan_name_ru || 'Без тарифа'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={clinic.subscription?.status === 'active' ? 'default' : 'secondary'}
                          className={cn(clinic.subscription?.status === 'active' && 'bg-chart-2 hover:bg-chart-2/80')}
                        >
                          {clinic.subscription?.status === 'active' ? 'Активна' :
                           clinic.subscription?.status === 'trial' ? 'Trial' :
                           clinic.subscription?.status || 'Нет'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {clinic.subscription?.current_period_end ? (
                          <span className={cn(isOverdue && "text-destructive font-medium")}>
                            {format(new Date(clinic.subscription.current_period_end), 'dd.MM.yyyy', { locale: ru })}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {daysLeft !== null ? (
                          <Badge variant={isOverdue ? 'destructive' : isExpiringSoon ? 'secondary' : 'outline'}>
                            {isOverdue ? `Просрочено ${Math.abs(daysLeft)} дн.` : `${daysLeft} дн.`}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => { setClinicToExtend(clinic); setExtendDialogOpen(true); }}>
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Продлить
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ExtendSubscriptionDialog clinic={clinicToExtend} open={extendDialogOpen} onOpenChange={setExtendDialogOpen} onSuccess={refresh} />
    </div>
  );
};

export default AdminSubscriptions;
