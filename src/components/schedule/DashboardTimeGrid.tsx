import { useMemo, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator';
import { cn } from '@/lib/utils';
import { isToday } from 'date-fns';
import type { Appointment, Patient, Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatPhone } from '@/lib/formatters';
import { Phone, Plus } from 'lucide-react';

interface DashboardTimeGridProps {
  appointments: (Appointment & { patient: Patient; doctor?: Profile })[];
  selectedDate: Date;
  workStart?: number;
  workEnd?: number;
  slotHeight?: number;
  onCreateAppointment?: (hour: number, minutes: number) => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Запланирован', color: 'text-info', bgColor: 'bg-info/10 border-info/20' },
  confirmed: { label: 'Подтверждён', color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
  in_progress: { label: 'В процессе', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
  completed: { label: 'Завершён', color: 'text-muted-foreground', bgColor: 'bg-muted border-muted' },
  cancelled: { label: 'Отменён', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
  no_show: { label: 'Не пришёл', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
};

export function DashboardTimeGrid({
  appointments,
  selectedDate,
  workStart = 9,
  workEnd = 20,
  slotHeight = 48,
  onCreateAppointment,
}: DashboardTimeGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ hour: number; minutes: number } | null>(null);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = workStart; hour <= workEnd; hour++) {
      slots.push({ hour, label: `${hour.toString().padStart(2, '0')}:00` });
    }
    return slots;
  }, [workStart, workEnd]);

  const getAppointmentPosition = (startTime: string) => {
    const date = new Date(startTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return (hours - workStart) * slotHeight + (minutes / 60) * slotHeight;
  };

  const getAppointmentHeight = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(duration * slotHeight, slotHeight * 0.5); // Minimum height
  };

  const handleSlotClick = useCallback((hour: number, minutes: number) => {
    if (onCreateAppointment) {
      onCreateAppointment(hour, minutes);
    }
  }, [onCreateAppointment]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, hour: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const quarterIndex = Math.floor((relativeY / slotHeight) * 4);
    const minutes = Math.min(quarterIndex * 15, 45);
    setHoveredSlot({ hour, minutes });
  }, [slotHeight]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Time slots */}
          {timeSlots.map(({ hour, label }) => (
            <div
              key={hour}
              className="flex border-b relative group"
              style={{ height: `${slotHeight}px` }}
              onMouseMove={(e) => handleMouseMove(e, hour)}
              onMouseLeave={() => setHoveredSlot(null)}
              onClick={() => {
                if (hoveredSlot?.hour === hour) {
                  handleSlotClick(hour, hoveredSlot.minutes);
                }
              }}
            >
              {/* Time label */}
              <div className="w-14 shrink-0 text-xs text-muted-foreground pr-2 text-right pt-0.5 border-r">
                {label}
              </div>

              {/* Slot area */}
              <div className="flex-1 relative cursor-pointer hover:bg-accent/30 transition-colors">
                {/* 15-minute lines */}
                <div 
                  className="absolute left-0 right-0 border-b border-dotted border-muted-foreground/10"
                  style={{ top: `${slotHeight / 4}px` }}
                />
                <div 
                  className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/20"
                  style={{ top: `${slotHeight / 2}px` }}
                />
                <div 
                  className="absolute left-0 right-0 border-b border-dotted border-muted-foreground/10"
                  style={{ top: `${(slotHeight / 4) * 3}px` }}
                />

                {/* Hover preview */}
                {hoveredSlot?.hour === hour && (
                  <div
                    className="absolute left-2 right-2 h-6 bg-primary/20 border border-primary/40 border-dashed rounded flex items-center justify-center gap-1 text-xs text-primary pointer-events-none z-10"
                    style={{ top: `${(hoveredSlot.minutes / 60) * slotHeight}px` }}
                  >
                    <Plus className="h-3 w-3" />
                    {hour.toString().padStart(2, '0')}:{hoveredSlot.minutes.toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Appointments overlay */}
          <div className="absolute top-0 bottom-0 left-14 right-0">
            {appointments.map((appointment) => {
              const top = getAppointmentPosition(appointment.start_time);
              const height = getAppointmentHeight(appointment.start_time, appointment.end_time);
              const status = statusConfig[appointment.status || 'scheduled'] || statusConfig.scheduled;
              const hasDebt = (appointment.patient?.balance ?? 0) < 0;

              return (
                <Link
                  key={appointment.id}
                  to={`/patients/${appointment.patient_id}`}
                  className={cn(
                    "absolute left-1 right-1 rounded-md border p-2 transition-all z-20",
                    "hover:shadow-md hover:scale-[1.01]",
                    status.bgColor
                  )}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                >
                  <div className="flex items-start justify-between gap-2 h-full overflow-hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatTime(appointment.start_time)}
                        </span>
                        {hasDebt && (
                          <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                            Долг
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">
                        {appointment.patient?.full_name}
                      </p>
                      {height > 50 && appointment.patient?.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 shrink-0" />
                          {formatPhone(appointment.patient.phone)}
                        </p>
                      )}
                      {height > 70 && appointment.doctor && (
                        <p className="text-xs text-muted-foreground truncate">
                          Врач: {appointment.doctor.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Current time indicator */}
            {isToday(selectedDate) && (
              <CurrentTimeIndicator 
                workStartHour={workStart} 
                workEndHour={workEnd} 
                slotHeight={slotHeight} 
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
