import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { DashboardTimeGrid } from '@/components/schedule/DashboardTimeGrid';
import { 
  Users, 
  Calendar as CalendarIcon, 
  CreditCard, 
  TrendingUp,
  Plus,
  User,
  ChevronRight,
  AlertCircle,
  Loader2,
  DollarSign
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Appointment, Patient, Profile } from '@/types/database';
import NewVisitSlideOver from '@/components/appointments/NewVisitSlideOver';
import { toast } from 'sonner';
import { useAppointmentNotifications } from '@/hooks/use-appointment-notifications';


const Dashboard = () => {
  const { clinic, profile, isSuperAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<(Appointment & { patient: Patient; doctor?: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [newVisitTime, setNewVisitTime] = useState<string | undefined>();
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


  // Enable appointment notifications
  useAppointmentNotifications({
    appointments,
    enabled: isToday(selectedDate),
    notifyMinutesBefore: 15,
  });

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
              ) : (
                <DashboardTimeGrid
                  appointments={appointments}
                  selectedDate={selectedDate}
                  workStart={9}
                  workEnd={20}
                  slotHeight={48}
                  onCreateAppointment={(hour, minutes) => {
                    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    setNewVisitTime(timeString);
                    setIsNewVisitOpen(true);
                  }}
                />
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
        onOpenChange={(open) => {
          setIsNewVisitOpen(open);
          if (!open) {
            setNewVisitTime(undefined);
          }
        }}
        selectedDate={selectedDate}
        selectedTime={newVisitTime}
        onSuccess={() => {
          fetchAppointments();
          fetchStats();
          setIsNewVisitOpen(false);
          setNewVisitTime(undefined);
        }}
      />
    </div>
  );
};

export default Dashboard;
