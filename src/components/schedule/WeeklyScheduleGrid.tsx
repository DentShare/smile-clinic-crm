import { useMemo, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Appointment, Patient, Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Link } from 'react-router-dom';
import { Plus, Clock, UserCheck, CheckCircle2, XCircle, UserX, DollarSign, ExternalLink } from 'lucide-react';
import { getAppointmentStyle, buildDoctorColorMap } from '@/lib/doctor-colors';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import { CompleteVisitDialog } from '@/components/appointments/CompleteVisitDialog';

const statusLabels: Record<string, string> = {
  scheduled: 'Запланирован',
  confirmed: 'Подтверждён',
  in_progress: 'Пришёл',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не пришёл',
};

interface WeeklyScheduleGridProps {
  appointments: (Appointment & { patient: Patient; doctor?: Profile })[];
  doctors?: Profile[];
  selectedDate: Date;
  workStart?: number;
  workEnd?: number;
  slotHeight?: number;
  onCreateAppointment?: (hour: number, minutes: number, date: Date) => void;
  onAppointmentUpdated?: () => void;
  doctorColorMap?: Map<string, number>;
}

export function WeeklyScheduleGrid({
  appointments,
  doctors = [],
  selectedDate,
  workStart = 9,
  workEnd = 20,
  slotHeight = 48,
  onCreateAppointment,
  onAppointmentUpdated,
  doctorColorMap: externalColorMap,
}: WeeklyScheduleGridProps) {
  const [completeDialogAppt, setCompleteDialogAppt] = useState<(Appointment & { patient: Patient; doctor?: Profile }) | null>(null);
  // Use external color map if provided, otherwise build from local doctors
  const doctorColorMap = useMemo(
    () => externalColorMap || buildDoctorColorMap(doctors.map(d => d.id)),
    [externalColorMap, doctors]
  );
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
                  const docIdx = doctorColorMap.get(appointment.doctor_id || '') ?? 0;
                  const colorStyle = getAppointmentStyle(docIdx, appointment.status || 'scheduled');
                  const hasDebt = (appointment.patient?.balance ?? 0) < 0;
                  const canAct = !['completed', 'cancelled', 'no_show'].includes(appointment.status);
                  const isPreArrival = appointment.status === 'scheduled' || appointment.status === 'confirmed';

                  return (
                    <Popover key={appointment.id}>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded border p-1 transition-all z-20 text-left",
                            "hover:shadow-md hover:z-30 hover:ring-1 hover:ring-primary/50",
                          )}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            minHeight: '20px',
                            backgroundColor: colorStyle.bg,
                            borderColor: colorStyle.border,
                            color: colorStyle.text,
                          }}
                        >
                          <div className="overflow-hidden h-full">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-medium" style={{ color: colorStyle.text }}>
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
                              <p className="text-[10px] truncate" style={{ opacity: 0.7 }}>
                                {appointment.doctor.full_name}
                              </p>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" className="w-64 p-3 space-y-2" align="start">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{appointment.patient?.full_name}</span>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border, color: colorStyle.text }}
                          >
                            {statusLabels[appointment.status] || appointment.status}
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

                        {/* Actions */}
                        {canAct && (
                          <div className="flex flex-col gap-1 pt-2 border-t">
                            <div className="flex gap-1">
                              {isPreArrival && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1 h-7 text-xs gap-1"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('appointments')
                                      .update({ status: 'in_progress' })
                                      .eq('id', appointment.id);
                                    if (error) { toast.error('Ошибка'); return; }
                                    toast.success('Пациент пришёл');
                                    onAppointmentUpdated?.();
                                  }}
                                >
                                  <UserCheck className="h-3 w-3" />
                                  Пришёл
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs gap-1"
                                onClick={() => setCompleteDialogAppt(appointment)}
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
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from('appointments')
                                    .update({ status: 'cancelled' })
                                    .eq('id', appointment.id);
                                  if (error) { toast.error('Ошибка'); return; }
                                  toast.success('Запись отменена');
                                  onAppointmentUpdated?.();
                                }}
                              >
                                <XCircle className="h-3 w-3" />
                                Отмена
                              </Button>
                              {isPreArrival && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs gap-1 text-orange-600 hover:text-orange-600"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('appointments')
                                      .update({ status: 'no_show' })
                                      .eq('id', appointment.id);
                                    if (error) { toast.error('Ошибка'); return; }
                                    toast.success('Отмечен как "Не пришёл"');
                                    onAppointmentUpdated?.();
                                  }}
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
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Complete Visit Dialog */}
      {completeDialogAppt && (
        <CompleteVisitDialog
          open={!!completeDialogAppt}
          onOpenChange={(open) => { if (!open) setCompleteDialogAppt(null); }}
          appointmentId={completeDialogAppt.id}
          patientId={completeDialogAppt.patient_id}
          patientName={completeDialogAppt.patient?.full_name || ''}
          doctorId={completeDialogAppt.doctor_id || undefined}
          onComplete={() => {
            setCompleteDialogAppt(null);
            onAppointmentUpdated?.();
          }}
        />
      )}
    </div>
  );
}
