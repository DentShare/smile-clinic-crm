import { useState } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  MoreVertical,
  Key,
  Calendar,
  Ban,
  ExternalLink,
  Phone,
  MessageCircle,
} from 'lucide-react';
import type { ClinicTenant, SubscriptionStatusType } from '@/types/superAdmin';
import { cn } from '@/lib/utils';

interface TenantsTableProps {
  clinics: ClinicTenant[];
  onSelectClinic: (clinic: ClinicTenant) => void;
  onLoginAsClinic: (clinic: ClinicTenant) => void;
  onExtendSubscription: (clinic: ClinicTenant) => void;
  onBlockClinic: (clinic: ClinicTenant) => void;
  loading?: boolean;
}

const statusConfig: Record<SubscriptionStatusType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Активна', variant: 'default' },
  trial: { label: 'Trial', variant: 'secondary' },
  past_due: { label: 'Просрочена', variant: 'destructive' },
  cancelled: { label: 'Отменена', variant: 'outline' },
  blocked: { label: 'Заблокирована', variant: 'destructive' },
};

const sourceLabels: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  referral: 'Реферал',
  exhibition: 'Выставка',
  google_ads: 'Google Ads',
  organic: 'Органика',
  other: 'Другое',
};

export function TenantsTable({
  clinics,
  onSelectClinic,
  onLoginAsClinic,
  onExtendSubscription,
  onBlockClinic,
  loading,
}: TenantsTableProps) {
  const [search, setSearch] = useState('');

  const filteredClinics = clinics.filter(clinic => {
    const searchLower = search.toLowerCase();
    return (
      clinic.name.toLowerCase().includes(searchLower) ||
      clinic.subdomain.toLowerCase().includes(searchLower) ||
      clinic.owner_name?.toLowerCase().includes(searchLower) ||
      clinic.phone?.includes(search) ||
      clinic.owner_phone?.includes(search)
    );
  });

  const getTrialProgress = (clinic: ClinicTenant) => {
    if (!clinic.subscription?.trial_ends_at) return null;
    const trialEnd = new Date(clinic.subscription.trial_ends_at);
    const now = new Date();
    const daysLeft = differenceInDays(trialEnd, now);
    const totalTrialDays = 14; // Assuming 14 day trial
    const progress = Math.max(0, Math.min(100, ((totalTrialDays - daysLeft) / totalTrialDays) * 100));
    return { daysLeft: Math.max(0, daysLeft), progress };
  };

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  };

  const getTelegramLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://t.me/+${cleanPhone}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse w-80" />
        <div className="border rounded-lg">
          <div className="h-64 bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, домену, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {filteredClinics.length} из {clinics.length}
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Клиника</TableHead>
              <TableHead>Владелец</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>Оплачено до</TableHead>
              <TableHead>Источник</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClinics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Клиники не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredClinics.map((clinic) => {
                const trialProgress = getTrialProgress(clinic);
                const paidUntil = clinic.subscription?.current_period_end;
                const isOverdue = paidUntil && isPast(new Date(paidUntil));
                
                return (
                  <TableRow 
                    key={clinic.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectClinic(clinic)}
                  >
                    {/* Clinic Name & Domain */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{clinic.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {clinic.subdomain}.dent-crm.uz
                        </div>
                      </div>
                    </TableCell>

                    {/* Owner Info */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{clinic.owner_name || '—'}</div>
                        {clinic.phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{clinic.phone}</span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {getWhatsAppLink(clinic.phone) && (
                                <a 
                                  href={getWhatsAppLink(clinic.phone)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-chart-2 hover:text-chart-2/80"
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                              )}
                              {getTelegramLink(clinic.phone) && (
                                <a 
                                  href={getTelegramLink(clinic.phone)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="space-y-2">
                        <Badge 
                          variant={statusConfig[clinic.subscription?.status || 'trial'].variant}
                          className={cn(
                            clinic.subscription?.status === 'active' && 'bg-chart-2 hover:bg-chart-2/80',
                            clinic.subscription?.status === 'trial' && 'bg-primary hover:bg-primary/80'
                          )}
                        >
                          {statusConfig[clinic.subscription?.status || 'trial'].label}
                        </Badge>
                        {clinic.subscription?.status === 'trial' && trialProgress && (
                          <div className="space-y-1">
                            <Progress value={trialProgress.progress} className="h-1.5 w-20" />
                            <span className="text-xs text-muted-foreground">
                              {trialProgress.daysLeft} дн. осталось
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Plan */}
                    <TableCell>
                      <Badge variant="outline">
                        {clinic.subscription?.plan_name_ru || 'Без тарифа'}
                      </Badge>
                    </TableCell>

                    {/* Paid Until */}
                    <TableCell>
                      {paidUntil ? (
                        <span className={cn(
                          "text-sm",
                          isOverdue && "text-destructive font-medium"
                        )}>
                          {format(new Date(paidUntil), 'dd.MM.yyyy', { locale: ru })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Acquisition Source */}
                    <TableCell>
                      {clinic.acquisition_source ? (
                        <Badge variant="outline" className="text-xs">
                          {sourceLabels[clinic.acquisition_source] || clinic.acquisition_source}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onLoginAsClinic(clinic)}>
                            <Key className="h-4 w-4 mr-2 text-chart-4" />
                            Войти как клиника
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onExtendSubscription(clinic)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Продлить подписку
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onBlockClinic(clinic)}
                            className="text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            {clinic.is_active ? 'Заблокировать' : 'Разблокировать'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
