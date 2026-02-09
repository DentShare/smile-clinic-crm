import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, Plus, ChevronLeft, ChevronRight, Loader2, CalendarDays, CalendarRange } from 'lucide-react';
import type { Appointment, Patient, Profile } from '@/types/database';
import { format, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import NewVisitSlideOver from '@/components/appointments/NewVisitSlideOver';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { WeeklyScheduleGrid } from '@/components/schedule/WeeklyScheduleGrid';
import { DoctorFilterTabs } from '@/components/dashboard/DoctorFilterTabs';
import { useAppointmentNotifications } from '@/hooks/use-appointment-notifications';
import { useClinicWorkingHoursRange } from '@/hooks/use-working-hours';
import { useStaffScope } from '@/hooks/use-staff-scope';

const SLOT_HEIGHT = 60;

type ViewMode = 'day' | 'week';

const Appointments = () => {
  const { clinic } = useAuth();
  const { hasFullAccess, allStaff, selectedDoctorId, setSelectedDoctorId, effectiveDoctorIds, isLoading: scopeLoading } = useStaffScope();
  const [appointments, setAppointments] = useState<(Appointment & { patient: Patient; doctor: Profile })[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [newVisitTime, setNewVisitTime] = useState<string | undefined>();
  const [newVisitDate, setNewVisitDate] = useState<Date | undefined>();
  const [newVisitDoctorId, setNewVisitDoctorId] = useState<string | undefined>();

  // Get clinic working hours
  const { workStart, workEnd } = useClinicWorkingHoursRange();

  const fetchAppointments = async () => {
    if (!clinic?.id) return;

    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'week') {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
      endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    }

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:profiles!appointments_doctor_id_fkey(*)
      `)
      .eq('clinic_id', clinic.id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    // Apply doctor scope filter
    if (effectiveDoctorIds !== null && effectiveDoctorIds.length > 0) {
      query = query.in('doctor_id', effectiveDoctorIds);
    } else if (effectiveDoctorIds !== null && effectiveDoctorIds.length === 0) {
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await query;

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
    if (!scopeLoading) {
      fetchAppointments();
      fetchDoctors();
    }
  }, [clinic?.id, selectedDate, viewMode, effectiveDoctorIds, scopeLoading]);

  // Enable appointment notifications
  useAppointmentNotifications({
    appointments,
    enabled: isToday(selectedDate),
    notifyMinutesBefore: 15,
  });

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      const navigated = direction > 0 ? addWeeks(newDate, 1) : subWeeks(newDate, 1);
      setSelectedDate(navigated);
    } else {
      newDate.setDate(newDate.getDate() + direction);
      setSelectedDate(newDate);
    }
  };

  const handleCreateAppointment = (hour: number, minutes: number, doctorIdOrDate?: string | Date) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    setNewVisitTime(timeString);
    
    if (doctorIdOrDate instanceof Date) {
      // From weekly view
      setNewVisitDate(doctorIdOrDate);
      setNewVisitDoctorId(undefined);
    } else {
      // From daily view
      setNewVisitDate(selectedDate);
      setNewVisitDoctorId(doctorIdOrDate);
    }
    setIsNewVisitOpen(true);
  };

  const getDateLabel = () => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: ru })} — ${format(weekEnd, 'd MMM yyyy', { locale: ru })}`;
    }
    return format(selectedDate, 'EEEE, d MMMM', { locale: ru });
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold">Расписание</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'day' ? 'Перетаскивайте записи для изменения времени' : 'Недельный вид расписания'}
            </p>
          </div>

          <Button onClick={() => setIsNewVisitOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Новая запись
          </Button>
        </div>

        {/* Date Navigation & View Toggle */}
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
                {getDateLabel()}
              </span>
              {viewMode === 'day' && isToday(selectedDate) && (
                <Badge variant="secondary" className="text-xs">Сегодня</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="bg-muted p-0.5 rounded-md"
            >
              <ToggleGroupItem value="day" aria-label="День" className="gap-1.5 px-3 data-[state=on]:bg-background">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">День</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Неделя" className="gap-1.5 px-3 data-[state=on]:bg-background">
                <CalendarRange className="h-4 w-4" />
                <span className="hidden sm:inline">Неделя</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <Button 
              variant={isToday(selectedDate) ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Сегодня
            </Button>
          </div>
        </div>
        {/* Doctor filter tabs (for admin/director) */}
        {hasFullAccess && allStaff.length > 0 && (
          <div className="shrink-0">
            <DoctorFilterTabs
              doctors={allStaff}
              selectedDoctorId={selectedDoctorId}
              onSelect={setSelectedDoctorId}
            />
          </div>
        )}

        {/* Calendar Grid */}
        <Card className="flex-1 min-h-0 overflow-hidden">
          <CardContent className="p-0 h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === 'day' ? (
              <ScheduleGrid
                appointments={appointments}
                doctors={doctors}
                selectedDate={selectedDate}
                workStart={workStart}
                workEnd={workEnd}
                slotHeight={SLOT_HEIGHT}
                onAppointmentUpdated={fetchAppointments}
                onCreateAppointment={(h, m, d) => handleCreateAppointment(h, m, d)}
              />
            ) : (
              <WeeklyScheduleGrid
                appointments={appointments}
                selectedDate={selectedDate}
                workStart={workStart}
                workEnd={workEnd}
                slotHeight={SLOT_HEIGHT}
                onCreateAppointment={(h, m, d) => handleCreateAppointment(h, m, d)}
              />
            )}
          </CardContent>
        </Card>

        {/* New Visit Slide-over */}
        <NewVisitSlideOver 
          open={isNewVisitOpen} 
          onOpenChange={(open) => {
            setIsNewVisitOpen(open);
            if (!open) {
              setNewVisitTime(undefined);
              setNewVisitDate(undefined);
              setNewVisitDoctorId(undefined);
            }
          }}
          selectedDate={newVisitDate || selectedDate}
          selectedTime={newVisitTime}
          selectedDoctorId={newVisitDoctorId}
          onSuccess={() => {
            fetchAppointments();
            setIsNewVisitOpen(false);
            setNewVisitTime(undefined);
            setNewVisitDate(undefined);
            setNewVisitDoctorId(undefined);
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default Appointments;
