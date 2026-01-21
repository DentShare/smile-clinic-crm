import { useMemo, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Appointment, Patient, Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface WeeklyScheduleGridProps {
  appointments: (Appointment & { patient: Patient; doctor?: Profile })[];
  selectedDate: Date;
  workStart?: number;
  workEnd?: number;
  slotHeight?: number;
  onCreateAppointment?: (hour: number, minutes: number, date: Date) => void;
}

const statusConfig: Record<string, { bgColor: string }> = {
  scheduled: { bgColor: 'bg-info/10 border-info/20' },
  confirmed: { bgColor: 'bg-success/10 border-success/20' },
  in_progress: { bgColor: 'bg-warning/10 border-warning/20' },
  completed: { bgColor: 'bg-muted border-muted' },
  cancelled: { bgColor: 'bg-destructive/10 border-destructive/20' },
  no_show: { bgColor: 'bg-destructive/10 border-destructive/20' },
};

export function WeeklyScheduleGrid({
  appointments,
  selectedDate,
  workStart = 9,
  workEnd = 20,
  slotHeight = 48,
  onCreateAppointment,
}: WeeklyScheduleGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ dayIndex: number; hour: number; minutes: number } | null>(null);

  // Get week days starting from Monday
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = workStart; hour <= workEnd; hour++) {
      slots.push({ hour, label: `${hour.toString().padStart(2, '0')}:00` });
    }
    return slots;
  }, [workStart, workEnd]);

  // Group appointments by day
  const appointmentsByDay = useMemo(() => {
    const grouped: Map<string, typeof appointments> = new Map();
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped.set(dayKey, appointments.filter(a => isSameDay(new Date(a.start_time), day)));
    });
    return grouped;
  }, [appointments, weekDays]);

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
    return Math.max(duration * slotHeight, slotHeight * 0.4);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, hour: number, dayIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const quarterIndex = Math.floor((relativeY / slotHeight) * 4);
    const minutes = Math.min(quarterIndex * 15, 45);
    setHoveredSlot({ dayIndex, hour, minutes });
  }, [slotHeight]);

  const handleSlotClick = useCallback((hour: number, minutes: number, dayIndex: number) => {
    if (onCreateAppointment) {
      onCreateAppointment(hour, minutes, weekDays[dayIndex]);
    }
  }, [onCreateAppointment, weekDays]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Day Headers */}
      <div className="flex border-b bg-muted/30 shrink-0">
        <div className="w-14 shrink-0 p-2 border-r text-xs text-muted-foreground">
          Время
        </div>
        {weekDays.map((day, index) => (
          <div 
            key={index}
            className={cn(
              "flex-1 min-w-[120px] p-2 border-r text-center",
              isToday(day) && "bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground">
              {format(day, 'EEE', { locale: ru })}
            </p>
            <p className={cn(
              "text-sm font-medium",
              isToday(day) && "text-primary"
            )}>
              {format(day, 'd MMM', { locale: ru })}
            </p>
            {isToday(day) && (
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4 mt-0.5">
                Сегодня
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-full">
          {/* Time Column */}
          <div className="w-14 shrink-0 border-r bg-muted/10">
            {timeSlots.map(({ hour, label }) => (
              <div 
                key={hour} 
                className="border-b text-xs text-muted-foreground flex flex-col relative"
                style={{ height: `${slotHeight}px` }}
              >
                <span className="absolute top-0 right-2">{label}</span>
                <span 
                  className="absolute right-2 text-muted-foreground/50"
                  style={{ top: `${slotHeight / 2 - 6}px` }}
                >
                  {hour.toString().padStart(2, '0')}:30
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayAppts = appointmentsByDay.get(dayKey) || [];
            
            return (
              <div 
                key={dayIndex} 
                className={cn(
                  "flex-1 min-w-[120px] border-r relative",
                  isToday(day) && "bg-primary/5"
                )}
              >
                {/* Time slots */}
                {timeSlots.map(({ hour }) => (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="border-b relative cursor-pointer hover:bg-accent/30 transition-colors"
                    style={{ height: `${slotHeight}px` }}
                    onMouseMove={(e) => handleMouseMove(e, hour, dayIndex)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onClick={() => {
                      if (hoveredSlot?.dayIndex === dayIndex && hoveredSlot?.hour === hour) {
                        handleSlotClick(hour, hoveredSlot.minutes, dayIndex);
                      }
                    }}
                  >
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
                    {hoveredSlot?.dayIndex === dayIndex && hoveredSlot?.hour === hour && (
                      <div
                        className="absolute left-1 right-1 h-5 bg-primary/20 border border-primary/40 border-dashed rounded flex items-center justify-center gap-1 text-xs text-primary pointer-events-none z-10"
                        style={{ top: `${(hoveredSlot.minutes / 60) * slotHeight}px` }}
                      >
                        <Plus className="h-3 w-3" />
                        {hour.toString().padStart(2, '0')}:{hoveredSlot.minutes.toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                ))}

                {/* Current time indicator */}
                {isToday(day) && (
                  <CurrentTimeIndicator 
                    workStartHour={workStart} 
                    workEndHour={workEnd} 
                    slotHeight={slotHeight} 
                  />
                )}

                {/* Appointments */}
                {dayAppts.map((appointment) => {
                  const top = getAppointmentPosition(appointment.start_time);
                  const height = getAppointmentHeight(appointment.start_time, appointment.end_time);
                  const status = statusConfig[appointment.status || 'scheduled'] || statusConfig.scheduled;
                  const hasDebt = (appointment.patient?.balance ?? 0) < 0;

                  return (
                    <Link
                      key={appointment.id}
                      to={`/patients/${appointment.patient_id}`}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded border p-1 transition-all z-20",
                        "hover:shadow-md hover:z-30",
                        status.bgColor
                      )}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '20px' }}
                    >
                      <div className="overflow-hidden h-full">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {formatTime(appointment.start_time)}
                          </span>
                          {hasDebt && (
                            <Badge variant="destructive" className="text-[9px] px-0.5 py-0 h-3">
                              Долг
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium truncate leading-tight">
                          {appointment.patient?.full_name}
                        </p>
                        {height > 40 && appointment.doctor && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {appointment.doctor.full_name}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
