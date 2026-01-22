import { useMemo, useState, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragMoveEvent, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator';
import { AppointmentQuickView } from '@/components/schedule/AppointmentQuickView';
import { cn } from '@/lib/utils';
import { isToday, setHours, setMinutes } from 'date-fns';
import type { Appointment, Patient, Profile } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { formatPhone } from '@/lib/formatters';
import { Phone, Plus, GripVertical, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardTimeGridProps {
  appointments: (Appointment & { patient: Patient; doctor?: Profile })[];
  selectedDate: Date;
  workStart?: number;
  workEnd?: number;
  slotHeight?: number;
  onCreateAppointment?: (hour: number, minutes: number) => void;
  onAppointmentUpdated?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Запланирован', color: 'text-info', bgColor: 'bg-info/10 border-info/20' },
  confirmed: { label: 'Подтверждён', color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
  in_progress: { label: 'В процессе', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
  completed: { label: 'Завершён', color: 'text-muted-foreground', bgColor: 'bg-muted border-muted' },
  cancelled: { label: 'Отменён', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
  no_show: { label: 'Не пришёл', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
};

// Draggable appointment card component
function DraggableAppointmentCard({
  appointment,
  top,
  height,
  slotHeight,
  onStatusChange,
}: {
  appointment: Appointment & { patient: Patient; doctor?: Profile };
  top: number;
  height: number;
  slotHeight: number;
  onStatusChange?: () => void;
}) {
  const status = statusConfig[appointment.status || 'scheduled'] || statusConfig.scheduled;
  const hasDebt = (appointment.patient?.balance ?? 0) < 0;
  const isCompleted = appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled' || appointment.status === 'no_show';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isCompleted || isCancelled,
  });

  const style = {
    top: `${top}px`,
    height: `${height}px`,
    minHeight: '40px',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppointmentQuickView appointment={appointment} onStatusChange={onStatusChange}>
      <div
        ref={setNodeRef}
        className={cn(
          "absolute left-1 right-1 rounded-md border p-2 transition-all cursor-pointer group",
          "hover:shadow-md hover:z-30",
          status.bgColor,
          isDragging && "opacity-50 shadow-2xl z-50"
        )}
        style={style}
      >
        <div className="flex items-start justify-between gap-1 h-full overflow-hidden">
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

          {!isCompleted && !isCancelled && (
            <div
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -m-1"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </AppointmentQuickView>
  );
}

export function DashboardTimeGrid({
  appointments,
  selectedDate,
  workStart = 9,
  workEnd = 20,
  slotHeight = 48,
  onCreateAppointment,
  onAppointmentUpdated,
}: DashboardTimeGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ hour: number; minutes: number } | null>(null);
  const [activeAppointment, setActiveAppointment] = useState<(Appointment & { patient: Patient; doctor?: Profile }) | null>(null);
  const [dragTargetTime, setDragTargetTime] = useState<{ hour: number; minute: number; top: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

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
    return Math.max(duration * slotHeight, slotHeight * 0.5);
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

  const handleDragStart = (event: DragStartEvent) => {
    const appointment = appointments.find(a => a.id === event.active.id);
    if (appointment) {
      setActiveAppointment(appointment);
      setHoveredSlot(null);
    }
  };

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, delta } = event;
    const appointment = appointments.find(a => a.id === active.id);
    if (!appointment) return;

    // Calculate target time with 15-minute snapping
    const currentTop = getAppointmentPosition(appointment.start_time);
    const newTop = currentTop + delta.y;
    const minutesFromStart = (newTop / slotHeight) * 60;
    const snappedMinutes = Math.round(minutesFromStart / 15) * 15;
    
    const newHour = workStart + Math.floor(snappedMinutes / 60);
    const newMinute = snappedMinutes % 60;

    // Validate bounds
    if (newHour >= workStart && newHour <= workEnd) {
      const snappedTop = (snappedMinutes / 60) * slotHeight;
      setDragTargetTime({ hour: newHour, minute: newMinute, top: snappedTop });
    }
  }, [appointments, slotHeight, workStart, workEnd]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveAppointment(null);
    setDragTargetTime(null);

    if (Math.abs(delta.y) < 5) return;

    const appointment = appointments.find(a => a.id === active.id);
    if (!appointment) return;

    // Calculate new time based on 15-minute snapping
    const oldStart = new Date(appointment.start_time);
    const oldEnd = new Date(appointment.end_time);
    const duration = oldEnd.getTime() - oldStart.getTime();

    // Calculate new position with 15-minute snap
    const currentTop = getAppointmentPosition(appointment.start_time);
    const newTop = currentTop + delta.y;
    const minutesFromStart = (newTop / slotHeight) * 60;
    const snappedMinutes = Math.round(minutesFromStart / 15) * 15;
    
    const newHour = workStart + Math.floor(snappedMinutes / 60);
    const newMinute = snappedMinutes % 60;

    // Validate bounds
    if (newHour < workStart || newHour > workEnd) return;

    const newStart = setMinutes(setHours(new Date(selectedDate), newHour), newMinute);
    const newEnd = new Date(newStart.getTime() + duration);

    // Don't update if same time
    if (oldStart.getHours() === newStart.getHours() && oldStart.getMinutes() === newStart.getMinutes()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Время записи изменено', {
        description: `${appointment.patient?.full_name} — ${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`,
      });

      onAppointmentUpdated?.();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Ошибка при изменении времени');
    }
  }, [appointments, selectedDate, slotHeight, workStart, workEnd, onAppointmentUpdated]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
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
                  {hoveredSlot?.hour === hour && !activeAppointment && (
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
            <div className="absolute top-0 bottom-0 left-14 right-0" ref={gridRef}>
              {appointments.map((appointment) => (
                <DraggableAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  top={getAppointmentPosition(appointment.start_time)}
                  height={getAppointmentHeight(appointment.start_time, appointment.end_time)}
                  slotHeight={slotHeight}
                  onStatusChange={onAppointmentUpdated}
                />
              ))}

              {/* Drag target time indicator */}
              {dragTargetTime && activeAppointment && (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-40"
                  style={{ top: `${dragTargetTime.top}px` }}
                >
                  {/* Target line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-sm" />
                  
                  {/* Time badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {dragTargetTime.hour.toString().padStart(2, '0')}:{dragTargetTime.minute.toString().padStart(2, '0')}
                  </div>
                </div>
              )}

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

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment && (
          <div 
            className={cn(
              "rounded-md border p-2 shadow-2xl bg-primary/20 border-primary",
              "w-[200px] opacity-90"
            )}
          >
            <p className="text-sm font-medium truncate">{activeAppointment.patient?.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(activeAppointment.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
