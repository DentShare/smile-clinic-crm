import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatPhone } from '@/lib/formatters';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Phone,
  Calendar,
  Clock,
  User,
  Stethoscope,
  AlertCircle,
  Pencil,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { Appointment, Patient, Profile } from '@/types/database';
import { cn } from '@/lib/utils';

interface AppointmentQuickViewProps {
  appointment: Appointment & { patient: Patient; doctor?: Profile };
  children: React.ReactNode;
  onStatusChange?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Запланирован', color: 'text-info', variant: 'outline' },
  confirmed: { label: 'Подтверждён', color: 'text-success', variant: 'secondary' },
  in_progress: { label: 'В процессе', color: 'text-warning', variant: 'secondary' },
  completed: { label: 'Завершён', color: 'text-muted-foreground', variant: 'secondary' },
  cancelled: { label: 'Отменён', color: 'text-destructive', variant: 'destructive' },
  no_show: { label: 'Не пришёл', color: 'text-destructive', variant: 'destructive' },
};

export function AppointmentQuickView({ 
  appointment, 
  children, 
  onStatusChange 
}: AppointmentQuickViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const status = statusConfig[appointment.status || 'scheduled'] || statusConfig.scheduled;
  const hasDebt = (appointment.patient?.balance ?? 0) < 0;
  const isCancelled = appointment.status === 'cancelled' || appointment.status === 'no_show';
  const isCompleted = appointment.status === 'completed';

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Запись отменена');
      onStatusChange?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Ошибка при отмене записи');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ru });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM, EEEE', { locale: ru });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-base truncate">
                {appointment.patient?.full_name}
              </h4>
              {appointment.patient?.phone && (
                <a 
                  href={`tel:${appointment.patient.phone}`}
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                >
                  <Phone className="h-3 w-3" />
                  {formatPhone(appointment.patient.phone)}
                </a>
              )}
            </div>
            <Badge variant={status.variant} className={cn("shrink-0", status.color)}>
              {status.label}
            </Badge>
          </div>

          {hasDebt && (
            <div className="mt-2 flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Задолженность: {Math.abs(appointment.patient?.balance || 0).toLocaleString('ru-RU')} сум</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatDate(appointment.start_time)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {formatTime(appointment.start_time)} — {formatTime(appointment.end_time)}
            </span>
          </div>

          {appointment.doctor && (
            <div className="flex items-center gap-2 text-sm">
              <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{appointment.doctor.full_name}</span>
              {appointment.doctor.specialization && (
                <span className="text-muted-foreground">({appointment.doctor.specialization})</span>
              )}
            </div>
          )}

          {appointment.complaints && (
            <div className="text-sm">
              <span className="text-muted-foreground">Жалобы: </span>
              <span>{appointment.complaints}</span>
            </div>
          )}

          {appointment.diagnosis && (
            <div className="text-sm">
              <span className="text-muted-foreground">Диагноз: </span>
              <span>{appointment.diagnosis}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="p-3 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-1.5"
            asChild
          >
            <Link to={`/patients/${appointment.patient_id}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              Карта пациента
            </Link>
          </Button>

          {!isCompleted && !isCancelled && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Отменить
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
