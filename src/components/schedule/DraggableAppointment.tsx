import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Clock, DollarSign, UserCheck, CalendarClock, GripVertical, CheckCircle2, XCircle, UserX, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Appointment, Patient, Profile } from '@/types/database';
import { CompleteVisitDialog } from '@/components/appointments/CompleteVisitDialog';
import { getAppointmentStyle } from '@/lib/doctor-colors';

const statusLabels: Record<string, { label: string; icon: React.ElementType }> = {
  scheduled: { label: 'Запланирован', icon: CalendarClock },
  confirmed: { label: 'Подтверждён', icon: Clock },
  in_progress: { label: 'Пришёл', icon: UserCheck },
  completed: { label: 'Завершён', icon: CheckCircle2 },
  cancelled: { label: 'Отменён', icon: Clock },
  no_show: { label: 'Не пришёл', icon: Clock },
};

interface DraggableAppointmentProps {
  appointment: Appointment & { patient: Patient; doctor?: Profile };
  top: number;
  height: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  isDraggingDisabled?: boolean;
  onStatusChange?: () => void;
  doctorColorIndex?: number;
}

export function DraggableAppointment({
  appointment,
  top,
  height,
  isHovered,
  onHover,
  isDraggingDisabled = false,
  onStatusChange,
  doctorColorIndex = 0,
}: DraggableAppointmentProps) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDraggingDisabled || ['completed', 'cancelled', 'no_show'].includes(appointment.status),
  });

  const statusInfo = statusLabels[appointment.status] || statusLabels.scheduled;
  const StatusIcon = statusInfo.icon;
  const colorStyle = getAppointmentStyle(doctorColorIndex, appointment.status);
  const hasDebt = (appointment.patient?.balance ?? 0) < 0;
  const canDrag = !['completed', 'cancelled', 'no_show'].includes(appointment.status);
  const canComplete = !['completed', 'cancelled', 'no_show'].includes(appointment.status);
  const isPreArrival = appointment.status === 'scheduled' || appointment.status === 'confirmed';

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const style = {
    top: `${top}px`,
    height: `${Math.max(height, 40)}px`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : popoverOpen ? 40 : isHovered ? 30 : 20,
    backgroundColor: colorStyle.bg,
    borderColor: colorStyle.border,
    color: colorStyle.text,
  };

  const handleStatusUpdate = async (status: string, message: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointment.id);
      if (error) throw error;
      toast.success(message);
      setPopoverOpen(false);
      onStatusChange?.();
    } catch (err) {
      console.error(err);
      toast.error('Ошибка');
    }
  };

  return (
    <>
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          className={cn(
            "absolute left-1 right-1 rounded-md border p-2 cursor-grab transition-shadow overflow-hidden touch-none",
            isDragging && "cursor-grabbing shadow-xl ring-2 ring-primary",
            (isHovered || popoverOpen) && !isDragging && "ring-2 ring-primary ring-offset-1 shadow-lg",
            !canDrag && "cursor-pointer"
          )}
          style={style}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          {...(canDrag ? { ...attributes, ...listeners } : {})}
        >
          {/* Drag handle indicator */}
          {canDrag && (
            <div className="absolute top-1 right-1 opacity-30">
              <GripVertical className="h-3 w-3" />
            </div>
          )}

          {/* Main content */}
          <div className="flex items-start gap-1.5">
            <StatusIcon className="h-3 w-3 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{appointment.patient?.full_name}</p>
              {height > 50 && (
                <p className="text-xs opacity-80 truncate">
                  {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                </p>
              )}
              {height > 70 && appointment.complaints && (
                <p className="text-xs opacity-70 truncate mt-0.5">{appointment.complaints}</p>
              )}
            </div>
            {hasDebt && (
              <div className="w-2 h-2 rounded-full bg-destructive shrink-0" title="Есть задолженность" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-64 p-3 space-y-2" align="start">
        <div className="flex items-center justify-between">
          <span className="font-medium">{appointment.patient?.full_name}</span>
          <Badge
            variant="outline"
            className="text-xs"
            style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border, color: colorStyle.text }}
          >
            {statusInfo.label}
          </Badge>
        </div>

        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
          </div>

          {appointment.doctor && (
            <p className="text-xs text-muted-foreground">{appointment.doctor.full_name}</p>
          )}

          {appointment.complaints && (
            <p className="text-xs">{appointment.complaints}</p>
          )}

          {hasDebt && (
            <div className="flex items-center gap-2 text-destructive">
              <DollarSign className="h-3 w-3" />
              <CurrencyDisplay amount={Math.abs(appointment.patient.balance)} size="sm" />
              <span className="text-xs">задолженность</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {canComplete && (
          <div className="flex flex-col gap-1 pt-2 border-t">
            <div className="flex gap-1">
              {isPreArrival && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() => handleStatusUpdate('in_progress', 'Пациент пришёл')}
                >
                  <UserCheck className="h-3 w-3" />
                  Пришёл
                </Button>
              )}
              <Button
                size="sm"
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => {
                  setPopoverOpen(false);
                  setCompleteDialogOpen(true);
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Завершить
              </Button>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => handleStatusUpdate('cancelled', 'Запись отменена')}
              >
                <XCircle className="h-3 w-3" />
                Отмена
              </Button>
              {isPreArrival && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs gap-1 text-orange-600 hover:text-orange-600"
                  onClick={() => handleStatusUpdate('no_show', 'Отмечен как "Не пришёл"')}
                >
                  <UserX className="h-3 w-3" />
                  Не пришёл
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Patient link */}
        <div className="pt-1 border-t">
          <Link
            to={`/patients/${appointment.patient_id}`}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Карта пациента
          </Link>
        </div>
      </PopoverContent>
    </Popover>

    <CompleteVisitDialog
      open={completeDialogOpen}
      onOpenChange={setCompleteDialogOpen}
      appointmentId={appointment.id}
      patientId={appointment.patient_id}
      patientName={appointment.patient?.full_name || ''}
      doctorId={appointment.doctor_id || undefined}
      onComplete={() => {
        onStatusChange?.();
      }}
    />
    </>
  );
}
