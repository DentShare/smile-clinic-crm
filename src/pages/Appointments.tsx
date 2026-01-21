import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Appointment, Patient, Profile } from '@/types/database';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Запланирован',
  confirmed: 'Подтверждён',
  in_progress: 'В процессе',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не пришёл',
};

const Appointments = () => {
  const { clinic } = useAuth();
  const [appointments, setAppointments] = useState<(Appointment & { patient: Patient; doctor: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  useEffect(() => {
    fetchAppointments();
  }, [clinic?.id, selectedDate]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Расписание</h1>
          <p className="text-muted-foreground">Управление записями пациентов</p>
        </div>

        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Новая запись
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-medium">
            {selectedDate.toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
          Сегодня
        </Button>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет записей на этот день</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3 min-w-[80px]">
                  <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="font-medium">{formatTime(appointment.start_time)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(appointment.end_time)}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{appointment.patient?.full_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {appointment.complaints || 'Без описания'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Врач: {appointment.doctor?.full_name || 'Не назначен'}
                  </p>
                </div>

                <Badge className={statusColors[appointment.status]}>
                  {statusLabels[appointment.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;
