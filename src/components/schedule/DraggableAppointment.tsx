import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Clock, DollarSign, UserCheck, CalendarClock, GripVertical, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment, Patient, Profile } from '@/types/database';
import { CompleteVisitDialog } from '@/components/appointments/CompleteVisitDialog';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Запланирован', color: 'bg-info/10 text-info border-info/20', icon: CalendarClock },
  confirmed: { label: 'Подтверждён', color: 'bg-success/10 text-success border-success/20', icon: Clock },
  in_progress: { label: 'В процессе', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  completed: { label: 'Завершён', color: 'bg-muted text-muted-foreground border-muted', icon: Clock },
  cancelled: { label: 'Отменён', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Clock },
  no_show: { label: 'Не пришёл', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Clock },
};

interface DraggableAppointmentProps {
  appointment: Appointment & { patient: Patient; doctor?: Profile };
  top: number;
  height: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  isDraggingDisabled?: boolean;
  onStatusChange?: () => void;
}

export function DraggableAppointment({
  appointment,
  top,
  height,
  isHovered,
  onHover,
  isDraggingDisabled = false,
  onStatusChange,
}: DraggableAppointmentProps) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDraggingDisabled || ['completed', 'cancelled', 'no_show'].includes(appointment.status),
  });

  const status = statusConfig[appointment.status] || statusConfig.scheduled;
  const StatusIcon = status.icon;
  const hasDebt = appointment.patient?.balance < 0;
  const canDrag = !['completed', 'cancelled', 'no_show'].includes(appointment.status);
  const canComplete = !['completed', 'cancelled', 'no_show'].includes(appointment.status);

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
    zIndex: isDragging ? 50 : isHovered ? 30 : 20,
  };

  return (
    <>
    <Tooltip open={isHovered && !isDragging}>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          className={cn(
            "absolute left-1 right-1 rounded-md border p-2 cursor-grab transition-shadow overflow-hidden touch-none",
            status.color,
            isDragging && "cursor-grabbing shadow-xl ring-2 ring-primary",
            isHovered && !isDragging && "ring-2 ring-primary ring-offset-1 shadow-lg",
            !canDrag && "cursor-default"
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
      </TooltipTrigger>
      <TooltipContent side="right" className="p-0 w-64">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{appointment.patient?.full_name}</span>
            <Badge variant="outline" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
            </div>
            
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

          {canDrag && (
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Перетащите для изменения времени
            </p>
          )}

          {/* Quick Actions */}
          <div className="flex gap-1 pt-2 border-t">
            {canComplete && (
              <Button 
                size="sm" 
                className="flex-1 h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompleteDialogOpen(true);
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Завершить
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Payment:', appointment.id);
              }}
            >
              <DollarSign className="h-3 w-3" />
              Оплата
            </Button>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>

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
