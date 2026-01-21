import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  UserCheck,
  CalendarClock,
  X
} from 'lucide-react';
import type { Appointment, Patient, Profile } from '@/types/database';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import NewVisitSlideOver from '@/components/appointments/NewVisitSlideOver';
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator';
import { useAppointmentNotifications } from '@/hooks/use-appointment-notifications';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Запланирован', color: 'bg-info/10 text-info border-info/20', icon: CalendarClock },
  confirmed: { label: 'Подтверждён', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  in_progress: { label: 'В процессе', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  completed: { label: 'Завершён', color: 'bg-muted text-muted-foreground border-muted', icon: CheckCircle2 },
  cancelled: { label: 'Отменён', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: X },
  no_show: { label: 'Не пришёл', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
};

// Working hours
const WORK_START = 9;
const WORK_END = 20;
const SLOT_HEIGHT = 60; // pixels per hour

const Appointments = () => {
  const { clinic } = useAuth();
  const [appointments, setAppointments] = useState<(Appointment & { patient: Patient; doctor: Profile })[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = WORK_START; hour <= WORK_END; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const fetchAppointments = async () => {
    if (!clinic?.id) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:profiles(*)
      `)
      .eq('clinic_id', clinic.id)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments(data as any);
    }
    setIsLoading(false);
  };

  const fetchDoctors = async () => {
    if (!clinic?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('clinic_id', clinic.id)
      .not('specialization', 'is', null);

    if (data) {
      setDoctors(data as Profile[]);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [clinic?.id, selectedDate]);

  // Enable appointment notifications
  useAppointmentNotifications({
    appointments,
    enabled: isToday(selectedDate),
    notifyMinutesBefore: 15,
  });

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAppointmentPosition = (startTime: string) => {
    const date = new Date(startTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const top = (hours - WORK_START) * SLOT_HEIGHT + (minutes / 60) * SLOT_HEIGHT;
    return top;
  };

  const getAppointmentHeight = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return duration * SLOT_HEIGHT;
  };

  // Group appointments by doctor
  const appointmentsByDoctor = useMemo(() => {
    const grouped: Record<string, typeof appointments> = {};
    doctors.forEach(doc => {
      grouped[doc.id] = appointments.filter(a => a.doctor_id === doc.id);
    });
    // Unassigned appointments
    grouped['unassigned'] = appointments.filter(a => !a.doctor_id);
    return grouped;
  }, [appointments, doctors]);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold">Расписание</h1>
            <p className="text-sm text-muted-foreground">Управление записями пациентов</p>
          </div>

          <Button onClick={() => setIsNewVisitOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Новая запись
          </Button>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
              </span>
              {isToday(selectedDate) && (
                <Badge variant="secondary" className="text-xs">Сегодня</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant={isToday(selectedDate) ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Сегодня
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="flex-1 min-h-0 overflow-hidden">
          <CardContent className="p-0 h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Doctor Headers */}
                <div className="flex border-b bg-muted/30 shrink-0">
                  <div className="w-16 shrink-0 p-2 border-r text-xs text-muted-foreground">
                    Время
                  </div>
                  {doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <div 
                        key={doctor.id} 
                        className="flex-1 min-w-[200px] p-2 border-r text-center"
                      >
                        <p className="text-sm font-medium truncate">{doctor.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                      </div>
                    ))
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
                      {timeSlots.map((time) => (
                        <div 
                          key={time} 
                          className="h-[60px] border-b text-xs text-muted-foreground flex items-start justify-end pr-2 pt-1"
                        >
                          {time}
                        </div>
                      ))}
                    </div>

                    {/* Doctor Columns */}
                    {doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <div key={doctor.id} className="flex-1 min-w-[200px] border-r relative">
                          {/* Grid lines */}
                          {timeSlots.map((time) => (
                            <div key={time} className="h-[60px] border-b border-dashed" />
                          ))}
                          
                          {/* Current time indicator */}
                          {isToday(selectedDate) && (
                            <CurrentTimeIndicator 
                              workStartHour={WORK_START} 
                              workEndHour={WORK_END} 
                              slotHeight={SLOT_HEIGHT} 
                            />
                          )}
                          
                          {/* Appointments */}
                          {appointmentsByDoctor[doctor.id]?.map((appointment) => (
                            <AppointmentBlock
                              key={appointment.id}
                              appointment={appointment}
                              top={getAppointmentPosition(appointment.start_time)}
                              height={getAppointmentHeight(appointment.start_time, appointment.end_time)}
                              isHovered={hoveredAppointment === appointment.id}
                              onHover={(hovered) => setHoveredAppointment(hovered ? appointment.id : null)}
                            />
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 relative">
                        {/* Grid lines */}
                        {timeSlots.map((time) => (
                          <div key={time} className="h-[60px] border-b border-dashed" />
                        ))}
                        
                        {/* Current time indicator */}
                        {isToday(selectedDate) && (
                          <CurrentTimeIndicator 
                            workStartHour={WORK_START} 
                            workEndHour={WORK_END} 
                            slotHeight={SLOT_HEIGHT} 
                          />
                        )}
                        
                        {/* All appointments */}
                        {appointments.map((appointment) => (
                          <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            top={getAppointmentPosition(appointment.start_time)}
                            height={getAppointmentHeight(appointment.start_time, appointment.end_time)}
                            isHovered={hoveredAppointment === appointment.id}
                            onHover={(hovered) => setHoveredAppointment(hovered ? appointment.id : null)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Visit Slide-over */}
        <NewVisitSlideOver 
          open={isNewVisitOpen} 
          onOpenChange={setIsNewVisitOpen}
          selectedDate={selectedDate}
          onSuccess={() => {
            fetchAppointments();
            setIsNewVisitOpen(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
};

// Appointment Block Component
interface AppointmentBlockProps {
  appointment: Appointment & { patient: Patient; doctor?: Profile };
  top: number;
  height: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}

const AppointmentBlock = ({ appointment, top, height, isHovered, onHover }: AppointmentBlockProps) => {
  const status = statusConfig[appointment.status] || statusConfig.scheduled;
  const StatusIcon = status.icon;
  const hasDebt = appointment.patient?.balance < 0;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Tooltip open={isHovered}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute left-1 right-1 rounded-md border p-2 cursor-pointer transition-all overflow-hidden",
            status.color,
            isHovered && "ring-2 ring-primary ring-offset-1 z-10 shadow-lg"
          )}
          style={{ top: `${top}px`, height: `${Math.max(height, 40)}px` }}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
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

          {/* Quick Actions */}
          <div className="flex gap-1 pt-2 border-t">
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Check-in:', appointment.id);
                // TODO: Implement check-in functionality
              }}
            >
              <UserCheck className="h-3 w-3" />
              Check-in
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Reschedule:', appointment.id);
                // TODO: Implement reschedule functionality
              }}
            >
              <CalendarClock className="h-3 w-3" />
              Перенести
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1 h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Payment:', appointment.id);
                // TODO: Implement payment functionality
              }}
            >
              <DollarSign className="h-3 w-3" />
              Оплата
            </Button>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default Appointments;
