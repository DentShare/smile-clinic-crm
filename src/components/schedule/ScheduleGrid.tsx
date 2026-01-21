import { useMemo, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator';
import { DraggableAppointment } from '@/components/schedule/DraggableAppointment';
import { DroppableTimeSlot } from '@/components/schedule/DroppableTimeSlot';
import { TimeSlotHoverPreview } from '@/components/schedule/TimeSlotHoverPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isToday, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Appointment, Patient, Profile } from '@/types/database';

interface ScheduleGridProps {
  appointments: (Appointment & { patient: Patient; doctor?: Profile })[];
  doctors: Profile[];
  selectedDate: Date;
  workStart: number;
  workEnd: number;
  slotHeight: number;
  onAppointmentUpdated: () => void;
  onCreateAppointment?: (hour: number, minutes: number, doctorId?: string) => void;
}

export function ScheduleGrid({
  appointments,
  doctors,
  selectedDate,
  workStart,
  workEnd,
  slotHeight,
  onAppointmentUpdated,
  onCreateAppointment,
}: ScheduleGridProps) {
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null);
  const [activeAppointment, setActiveAppointment] = useState<(Appointment & { patient: Patient; doctor?: Profile }) | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
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

  // Group appointments by doctor
  const appointmentsByDoctor = useMemo(() => {
    const grouped: Record<string, typeof appointments> = {};
    doctors.forEach(doc => {
      grouped[doc.id] = appointments.filter(a => a.doctor_id === doc.id);
    });
    grouped['unassigned'] = appointments.filter(a => !a.doctor_id);
    return grouped;
  }, [appointments, doctors]);

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
    return duration * slotHeight;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const appointment = appointments.find(a => a.id === active.id);
    if (appointment) {
      setActiveAppointment(appointment);
      setHoveredAppointment(null);
    }
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over) return;

    const appointment = appointments.find(a => a.id === active.id);
    if (!appointment) return;

    const dropData = over.data.current as { hour: number; doctorId?: string } | undefined;
    if (!dropData) return;

    const { hour, doctorId } = dropData;

    // Calculate new times
    const oldStart = new Date(appointment.start_time);
    const oldEnd = new Date(appointment.end_time);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = setMinutes(setHours(new Date(selectedDate), hour), 0);
    const newEnd = new Date(newStart.getTime() + duration);

    // Don't update if dropped on same time
    if (oldStart.getHours() === hour && (!doctorId || doctorId === appointment.doctor_id)) {
      return;
    }

    try {
      const updateData: { start_time: string; end_time: string; doctor_id?: string | null } = {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };

      // Update doctor if dropped on different column
      if (doctorId && doctorId !== appointment.doctor_id) {
        updateData.doctor_id = doctorId === 'unassigned' ? null : doctorId;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Запись перенесена', {
        description: `${appointment.patient?.full_name} — ${hour}:00`,
      });

      onAppointmentUpdated();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Ошибка при переносе записи');
    }
  }, [appointments, selectedDate, onAppointmentUpdated]);

  const handleTimeSlotClick = useCallback((hour: number, minutes: number, doctorId?: string) => {
    if (onCreateAppointment) {
      onCreateAppointment(hour, minutes, doctorId === 'unassigned' ? undefined : doctorId);
    }
  }, [onCreateAppointment]);

  const renderDoctorColumn = (doctorId: string, doctorAppts: typeof appointments) => (
    <div key={doctorId} className="flex-1 min-w-[200px] border-r relative">
      {/* Hover Preview Layer */}
      {onCreateAppointment && (
        <TimeSlotHoverPreview
          slotHeight={slotHeight}
          workStart={workStart}
          onTimeClick={(hour, minutes) => handleTimeSlotClick(hour, minutes, doctorId)}
          doctorId={doctorId}
        />
      )}

      {/* Droppable time slots */}
      {timeSlots.map(({ hour, label }) => (
        <DroppableTimeSlot
          key={`${doctorId}-${hour}`}
          id={`${doctorId}-${hour}`}
          hour={hour}
          doctorId={doctorId}
          slotHeight={slotHeight}
        />
      ))}
      
      {/* Current time indicator */}
      {isToday(selectedDate) && (
        <CurrentTimeIndicator 
          workStartHour={workStart} 
          workEndHour={workEnd} 
          slotHeight={slotHeight} 
        />
      )}
      
      {/* Appointments */}
      {doctorAppts?.map((appointment) => (
        <DraggableAppointment
          key={appointment.id}
          appointment={appointment}
          top={getAppointmentPosition(appointment.start_time)}
          height={getAppointmentHeight(appointment.start_time, appointment.end_time)}
          isHovered={hoveredAppointment === appointment.id}
          onHover={(hovered) => setHoveredAppointment(hovered ? appointment.id : null)}
        />
      ))}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Doctor Headers */}
        <div className="flex border-b bg-muted/30 shrink-0">
          <div className="w-16 shrink-0 p-2 border-r text-xs text-muted-foreground">
            Время
          </div>
          {doctors.length > 0 ? (
            <>
              {doctors.map((doctor) => (
                <div 
                  key={doctor.id} 
                  className="flex-1 min-w-[200px] p-2 border-r text-center"
                >
                  <p className="text-sm font-medium truncate">{doctor.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                </div>
              ))}
              {/* Unassigned column header if there are unassigned appointments */}
              {appointmentsByDoctor['unassigned']?.length > 0 && (
                <div className="flex-1 min-w-[200px] p-2 border-r text-center">
                  <p className="text-sm font-medium truncate">Без врача</p>
                  <p className="text-xs text-muted-foreground truncate">Не назначен</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 p-2 text-center text-sm text-muted-foreground">
              Все записи
            </div>
          )}
        </div>

        {/* Time Grid */}
        <ScrollArea className="flex-1">
          <div className="flex min-h-full">
            {/* Time Column */}
            <div className="w-16 shrink-0 border-r bg-muted/10">
              {timeSlots.map(({ hour, label }) => (
                <div 
                  key={hour} 
                  className="border-b text-xs text-muted-foreground flex flex-col relative"
                  style={{ height: `${slotHeight}px` }}
                >
                  <span className="absolute top-0 right-2">{label}</span>
                  {/* Half-hour label */}
                  <span 
                    className="absolute right-2 text-muted-foreground/50"
                    style={{ top: `${slotHeight / 2 - 6}px` }}
                  >
                    {hour.toString().padStart(2, '0')}:30
                  </span>
                </div>
              ))}
            </div>

            {/* Doctor Columns */}
            {doctors.length > 0 ? (
              <>
                {doctors.map((doctor) => renderDoctorColumn(doctor.id, appointmentsByDoctor[doctor.id]))}
                {/* Also show unassigned appointments column if there are any */}
                {appointmentsByDoctor['unassigned']?.length > 0 && (
                  renderDoctorColumn('unassigned', appointmentsByDoctor['unassigned'])
                )}
              </>
            ) : (
              renderDoctorColumn('unassigned', appointments)
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAppointment && (
          <div 
            className={cn(
              "rounded-md border p-2 shadow-2xl bg-primary/20 border-primary",
              "w-[180px] opacity-90"
            )}
          >
            <p className="text-xs font-medium truncate">{activeAppointment.patient?.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(activeAppointment.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
