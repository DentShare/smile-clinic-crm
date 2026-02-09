import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { format, isFuture, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  doctor: {
    full_name: string;
  } | null;
}

interface PatientUpcomingVisitsProps {
  patientId: string;
  onCreateVisit?: () => void;
}

export function PatientUpcomingVisits({ patientId, onCreateVisit }: PatientUpcomingVisitsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingAppointments();
  }, [patientId]);

  const fetchUpcomingAppointments = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          doctor:doctor_id (full_name)
        `)
        .eq('patient_id', patientId)
        .gte('start_time', now)
        .in('status', ['scheduled', 'confirmed'])
        .order('start_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      setAppointments((data as unknown as Appointment[]) || []);
    } catch (err) {
      console.error('Error fetching upcoming appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, startTime: string) => {
    if (isToday(new Date(startTime))) {
      return <Badge className="bg-primary/10 text-primary border-primary/20">Сегодня</Badge>;
    }
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Подтверждён</Badge>;
      case 'scheduled':
      default:
        return <Badge variant="secondary">Запланирован</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Предстоящие визиты
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Предстоящие визиты
          </span>
          {appointments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {appointments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {appointments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Нет запланированных визитов
            </p>
            {onCreateVisit && (
              <Button variant="outline" size="sm" onClick={onCreateVisit} className="gap-2">
                <Plus className="h-4 w-4" />
                Запланировать визит
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div 
                key={apt.id} 
                className="flex items-start justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(apt.start_time), 'd MMMM, HH:mm', { locale: ru })}
                  </div>
                  {apt.doctor && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {apt.doctor.full_name}
                    </div>
                  )}
                </div>
                {getStatusBadge(apt.status, apt.start_time)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
