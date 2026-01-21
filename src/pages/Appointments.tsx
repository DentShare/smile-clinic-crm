import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Calendar, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Appointment, Patient, Profile } from '@/types/database';
import { format, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import NewVisitSlideOver from '@/components/appointments/NewVisitSlideOver';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { useAppointmentNotifications } from '@/hooks/use-appointment-notifications';

// Working hours
const WORK_START = 9;
const WORK_END = 20;
const SLOT_HEIGHT = 60;

const Appointments = () => {
  const { clinic } = useAuth();
  const [appointments, setAppointments] = useState<(Appointment & { patient: Patient; doctor: Profile })[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);

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

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold">Расписание</h1>
            <p className="text-sm text-muted-foreground">
              Перетаскивайте записи для изменения времени
            </p>
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
              <ScheduleGrid
                appointments={appointments}
                doctors={doctors}
                selectedDate={selectedDate}
                workStart={WORK_START}
                workEnd={WORK_END}
                slotHeight={SLOT_HEIGHT}
                onAppointmentUpdated={fetchAppointments}
              />
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

export default Appointments;
