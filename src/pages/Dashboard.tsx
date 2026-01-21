import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { 
  Users, 
  Calendar as CalendarIcon, 
  CreditCard, 
  TrendingUp,
  Plus,
  Clock,
  User,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  UserCheck,
  Phone
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/formatters';
import type { Appointment, Patient, Profile } from '@/types/database';
import NewVisitSlideOver from '@/components/appointments/NewVisitSlideOver';
import { toast } from 'sonner';
import { useAppointmentNotifications } from '@/hooks/use-appointment-notifications';
import { useCurrentTime } from '@/hooks/use-current-time';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Запланирован', color: 'text-info', bgColor: 'bg-info/10 border-info/20' },
  confirmed: { label: 'Подтверждён', color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
  in_progress: { label: 'В процессе', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
  completed: { label: 'Завершён', color: 'text-muted-foreground', bgColor: 'bg-muted border-muted' },
  cancelled: { label: 'Отменён', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
  no_show: { label: 'Не пришёл', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
};

const Dashboard = () => {
  const { clinic, profile, isSuperAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<(Appointment & { patient: Patient; doctor?: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    todayRevenue: 0,
    pendingPayments: 0,
  });

  const fetchAppointments = async () => {
    if (!clinic?.id) return;

    const startDate = startOfDay(selectedDate);
    const endDate = endOfDay(selectedDate);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:profiles(*)
      `)
      .eq('clinic_id', clinic.id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments(data as any);
    }
    setIsLoading(false);
  };

  const fetchStats = async () => {
    if (!clinic?.id) return;

    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    // Fetch patient count
    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinic.id);

    // Fetch today's appointments count
    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinic.id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    // Fetch today's payments
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('clinic_id', clinic.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Fetch pending payments (negative balances)
    const { data: debtPatients } = await supabase
      .from('patients')
      .select('balance')
      .eq('clinic_id', clinic.id)
      .lt('balance', 0);

    const pendingPayments = debtPatients?.reduce((sum, p) => sum + Math.abs(p.balance || 0), 0) || 0;

    setStats({
      totalPatients: patientsCount || 0,
      todayAppointments: appointmentsCount || 0,
      todayRevenue: totalRevenue,
      pendingPayments,
    });
  };

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, [clinic?.id, selectedDate]);

  const handleCheckIn = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'in_progress' })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Ошибка при обновлении статуса');
    } else {
      toast.success('Пациент пришёл');
      fetchAppointments();
    }
  };

  const currentTime = useCurrentTime(60000);
  
  // Enable appointment notifications
  useAppointmentNotifications({
    appointments,
    enabled: isToday(selectedDate),
    notifyMinutesBefore: 15,
  });

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return timeA - timeB;
    });
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    if (!isToday(selectedDate)) return sortedAppointments;
    
    const now = new Date();
    return sortedAppointments.filter(a => {
      const startTime = new Date(a.start_time);
      return startTime >= now || a.status === 'in_progress';
    });
  }, [sortedAppointments, selectedDate]);

  const pastAppointments = useMemo(() => {
    if (!isToday(selectedDate)) return [];
    
    const now = new Date();
    return sortedAppointments.filter(a => {
      const startTime = new Date(a.start_time);
      return startTime < now && a.status !== 'in_progress';
    });
  }, [sortedAppointments, selectedDate]);

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Панель Super Admin</h1>
          <p className="text-muted-foreground">Управление платформой DentaClinic</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего клиник</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">активных подписок</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 сум</div>
              <p className="text-xs text-muted-foreground">ежемесячный доход</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">отток за месяц</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Триальные</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">на триале</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">
            Добро пожаловать, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-muted-foreground">{clinic?.name}</p>
        </div>
        <Button onClick={() => setIsNewVisitOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Новая запись
        </Button>
      </div>

      {/* Main Layout: 3-column grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* LEFT COLUMN - Mini Calendar & Stats */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Mini Calendar */}
          <Card className="shrink-0">
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                classNames={{
                  months: "space-y-2",
                  month: "space-y-2",
                  caption: "flex justify-center pt-1 relative items-center text-sm",
                  caption_label: "font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                  table: "w-full border-collapse",
                  head_row: "flex justify-between",
                  head_cell: "text-muted-foreground rounded-md w-8 font-normal text-xs",
                  row: "flex w-full justify-between mt-1",
                  cell: "text-center text-sm p-0 relative",
                  day: "h-8 w-8 p-0 font-normal text-xs hover:bg-accent hover:text-accent-foreground rounded-md",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                }}
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Сегодня</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Записей</span>
                </div>
                <span className="font-semibold">{stats.todayAppointments}</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>Выручка</span>
                </div>
                <CurrencyDisplay amount={stats.todayRevenue} size="sm" className="font-semibold" />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Пациентов</span>
                </div>
                <span className="font-semibold">{stats.totalPatients}</span>
              </div>
              
              {stats.pendingPayments > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Долги</span>
                    </div>
                    <CurrencyDisplay amount={stats.pendingPayments} size="sm" className="font-semibold text-destructive" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN - Today's Schedule */}
        <div className="lg:col-span-6 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 shrink-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-medium">
                  {isToday(selectedDate) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
                </CardTitle>
                {isToday(selectedDate) && (
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(), 'EEEE', { locale: ru })}
                  </Badge>
                )}
              </div>
              <Link to="/appointments">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Расписание
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Нет записей на этот день</p>
                  <Button 
                    variant="link" 
                    onClick={() => setIsNewVisitOpen(true)}
                    className="mt-2"
                  >
                    Создать запись
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {/* Current/Upcoming appointments */}
                    {upcomingAppointments.map((appointment) => (
                      <AppointmentCard 
                        key={appointment.id} 
                        appointment={appointment}
                        onCheckIn={handleCheckIn}
                        isNow={appointment.status === 'in_progress'}
                      />
                    ))}
                    
                    {/* Past appointments (collapsed section) */}
                    {pastAppointments.length > 0 && isToday(selectedDate) && (
                      <>
                        <div className="flex items-center gap-2 py-2">
                          <Separator className="flex-1" />
                          <span className="text-xs text-muted-foreground">Прошедшие</span>
                          <Separator className="flex-1" />
                        </div>
                        {pastAppointments.map((appointment) => (
                          <AppointmentCard 
                            key={appointment.id} 
                            appointment={appointment}
                            onCheckIn={handleCheckIn}
                            isPast
                          />
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Quick Actions & Info */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setIsNewVisitOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs">Запись</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                asChild
              >
                <Link to="/patients">
                  <User className="h-4 w-4" />
                  <span className="text-xs">Пациент</span>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                asChild
              >
                <Link to="/payments">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Оплата</span>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                asChild
              >
                <Link to="/services">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Услуги</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Next few days preview */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ближайшие дни</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((daysAhead) => {
                const futureDate = addDays(new Date(), daysAhead);
                return (
                  <button
                    key={daysAhead}
                    onClick={() => setSelectedDate(futureDate)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg border text-left transition-colors",
                      "hover:bg-accent hover:border-accent-foreground/20"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {format(futureDate, 'EEEE', { locale: ru })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(futureDate, 'd MMMM', { locale: ru })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Visit Slide-over */}
      <NewVisitSlideOver 
        open={isNewVisitOpen} 
        onOpenChange={setIsNewVisitOpen}
        selectedDate={selectedDate}
        onSuccess={() => {
          fetchAppointments();
          fetchStats();
          setIsNewVisitOpen(false);
        }}
      />
    </div>
  );
};

// Appointment Card Component
interface AppointmentCardProps {
  appointment: Appointment & { patient: Patient; doctor?: Profile };
  onCheckIn: (id: string) => void;
  isNow?: boolean;
  isPast?: boolean;
}

const AppointmentCard = ({ appointment, onCheckIn, isNow, isPast }: AppointmentCardProps) => {
  const status = statusConfig[appointment.status] || statusConfig.scheduled;
  const hasDebt = appointment.patient?.balance < 0;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        isNow && "ring-2 ring-primary bg-primary/5 border-primary/30",
        isPast && "opacity-60",
        !isNow && !isPast && "hover:bg-accent/50"
      )}
    >
      {/* Time */}
      <div className="shrink-0 text-center w-14">
        <p className={cn("text-sm font-semibold", isNow && "text-primary")}>
          {formatTime(appointment.start_time)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(appointment.end_time)}
        </p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link 
              to={`/patients/${appointment.patient_id}`}
              className="font-medium text-sm hover:underline truncate block"
            >
              {appointment.patient?.full_name}
            </Link>
            {appointment.patient?.phone && (
              <a 
                href={`tel:${appointment.patient.phone}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Phone className="h-3 w-3" />
                {formatPhone(appointment.patient.phone)}
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {hasDebt && (
              <Badge variant="destructive" className="text-xs px-1.5">
                Долг
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1.5", status.bgColor, status.color)}
            >
              {status.label}
            </Badge>
          </div>
        </div>

        {appointment.complaints && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {appointment.complaints}
          </p>
        )}

        {appointment.doctor && (
          <p className="text-xs text-muted-foreground mt-1">
            Врач: {appointment.doctor.full_name}
          </p>
        )}

        {/* Quick actions for scheduled appointments */}
        {appointment.status === 'scheduled' && !isPast && (
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onCheckIn(appointment.id)}
            >
              <UserCheck className="h-3 w-3" />
              Пациент пришёл
            </Button>
          </div>
        )}

        {isNow && (
          <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
            <Clock className="h-3 w-3 animate-pulse" />
            Сейчас на приёме
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
