import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format, parseISO, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface RevenueDataPoint {
  name: string;
  date: string;
  value: number;
}

export interface ConversionData {
  name: string;
  value: number;
  color: string;
}

export interface ServiceStats {
  name: string;
  value: number;
  revenue: number;
}

export interface AnalyticsKPIs {
  conversionRate: number;
  conversionGrowth: number;
  averageCheck: number;
  newPatients: number;
  doctorWorkload: number;
}

export interface ClinicAnalyticsData {
  revenueData: RevenueDataPoint[];
  conversionData: ConversionData[];
  servicesData: ServiceStats[];
  kpis: AnalyticsKPIs;
  isLoading: boolean;
  error: Error | null;
}

type DateRange = 'week' | 'month' | 'quarter';

export function useClinicAnalytics(dateRange: DateRange = 'week'): ClinicAnalyticsData {
  const { clinic } = useAuth();
  const clinicId = clinic?.id;

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (dateRange) {
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'quarter':
      startDate = startOfMonth(subMonths(now, 2));
      endDate = endOfMonth(now);
      break;
    default:
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Previous period for growth calculation
  const periodDuration = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - periodDuration);
  const prevEndDate = new Date(endDate.getTime() - periodDuration);
  const prevStartDateStr = format(prevStartDate, 'yyyy-MM-dd');
  const prevEndDateStr = format(prevEndDate, 'yyyy-MM-dd');

  // Query: Revenue by day
  const { data: revenueByDay, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics', 'revenue', clinicId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr + 'T23:59:59')
        .gt('amount', 0); // Exclude refunds

      if (error) throw error;

      // Group by day
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const revenueMap = new Map<string, number>();

      days.forEach(day => {
        revenueMap.set(format(day, 'yyyy-MM-dd'), 0);
      });

      (data || []).forEach(payment => {
        const date = format(parseISO(payment.created_at!), 'yyyy-MM-dd');
        const current = revenueMap.get(date) || 0;
        revenueMap.set(date, current + Number(payment.amount));
      });

      return Array.from(revenueMap.entries()).map(([date, value]) => ({
        date,
        name: format(parseISO(date), 'EEE', { locale: ru }),
        value,
      }));
    },
    enabled: !!clinicId,
  });

  // Query: Appointments for conversion funnel
  const { data: appointmentStats, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['analytics', 'appointments', clinicId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!clinicId) return { scheduled: 0, completed: 0, paid: 0 };

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, status, patient_id')
        .eq('clinic_id', clinicId)
        .gte('start_time', startDateStr)
        .lte('start_time', endDateStr + 'T23:59:59');

      if (error) throw error;

      const scheduled = appointments?.length || 0;
      const completed = appointments?.filter(a => a.status === 'completed').length || 0;

      // Check which completed appointments have payments
      const completedAppointmentIds = appointments
        ?.filter(a => a.status === 'completed')
        .map(a => a.id) || [];

      if (completedAppointmentIds.length === 0) {
        return { scheduled, completed, paid: 0 };
      }

      // Count appointments with payments (via performed_works)
      const { data: paidWorks, error: worksError } = await supabase
        .from('performed_works')
        .select('appointment_id')
        .in('appointment_id', completedAppointmentIds);

      if (worksError) throw worksError;

      const paidAppointments = new Set(paidWorks?.map(w => w.appointment_id)).size;

      return { scheduled, completed, paid: paidAppointments };
    },
    enabled: !!clinicId,
  });

  // Query: Previous period appointments for growth
  const { data: prevAppointmentStats } = useQuery({
    queryKey: ['analytics', 'appointments-prev', clinicId, prevStartDateStr, prevEndDateStr],
    queryFn: async () => {
      if (!clinicId) return { scheduled: 0, completed: 0 };

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('clinic_id', clinicId)
        .gte('start_time', prevStartDateStr)
        .lte('start_time', prevEndDateStr + 'T23:59:59');

      if (error) throw error;

      const scheduled = appointments?.length || 0;
      const completed = appointments?.filter(a => a.status === 'completed').length || 0;

      return { scheduled, completed };
    },
    enabled: !!clinicId,
  });

  // Query: Popular services
  const { data: servicesStats, isLoading: servicesLoading } = useQuery({
    queryKey: ['analytics', 'services', clinicId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('performed_works')
        .select(`
          service_id,
          total,
          services!performed_works_service_id_fkey (name)
        `)
        .eq('clinic_id', clinicId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr + 'T23:59:59');

      if (error) throw error;

      // Group by service
      const serviceMap = new Map<string, { count: number; revenue: number; name: string }>();

      (data || []).forEach(work => {
        const serviceName = (work.services as any)?.name || 'Без услуги';
        const current = serviceMap.get(serviceName) || { count: 0, revenue: 0, name: serviceName };
        serviceMap.set(serviceName, {
          ...current,
          count: current.count + 1,
          revenue: current.revenue + Number(work.total),
        });
      });

      return Array.from(serviceMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(s => ({
          name: s.name,
          value: s.count,
          revenue: s.revenue,
        }));
    },
    enabled: !!clinicId,
  });

  // Query: New patients
  const { data: newPatientsCount } = useQuery({
    queryKey: ['analytics', 'new-patients', clinicId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!clinicId) return 0;

      const { count, error } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr + 'T23:59:59');

      if (error) throw error;

      return count || 0;
    },
    enabled: !!clinicId,
  });

  // Query: Average check
  const { data: avgCheckData } = useQuery({
    queryKey: ['analytics', 'avg-check', clinicId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!clinicId) return 0;

      const { data, error } = await supabase
        .from('performed_works')
        .select('appointment_id, total')
        .eq('clinic_id', clinicId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr + 'T23:59:59');

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      // Group by appointment
      const appointmentTotals = new Map<string, number>();
      data.forEach(work => {
        const current = appointmentTotals.get(work.appointment_id) || 0;
        appointmentTotals.set(work.appointment_id, current + Number(work.total));
      });

      const totalRevenue = Array.from(appointmentTotals.values()).reduce((sum, v) => sum + v, 0);
      return appointmentTotals.size > 0 ? Math.round(totalRevenue / appointmentTotals.size) : 0;
    },
    enabled: !!clinicId,
  });

  // Query: Doctor workload
  const { data: doctorWorkload } = useQuery({
    queryKey: ['analytics', 'workload', clinicId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!clinicId) return 0;

      // Get all doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;

      const doctorIds = doctors?.map(d => d.id) || [];
      if (doctorIds.length === 0) return 0;

      // Get doctor schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('doctor_schedules')
        .select('doctor_id, start_time, end_time, is_working')
        .eq('clinic_id', clinicId)
        .eq('is_working', true)
        .in('doctor_id', doctorIds);

      if (schedulesError) throw schedulesError;

      // Calculate total available hours per week per doctor
      const hoursPerDoctor = new Map<string, number>();
      (schedules || []).forEach(schedule => {
        const start = parseInt(schedule.start_time.split(':')[0]);
        const end = parseInt(schedule.end_time.split(':')[0]);
        const hours = end - start;
        const current = hoursPerDoctor.get(schedule.doctor_id) || 0;
        hoursPerDoctor.set(schedule.doctor_id, current + hours);
      });

      const totalAvailableHours = Array.from(hoursPerDoctor.values()).reduce((sum, h) => sum + h, 0);

      // Get actual appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('doctor_id, start_time, end_time')
        .eq('clinic_id', clinicId)
        .gte('start_time', startDateStr)
        .lte('start_time', endDateStr + 'T23:59:59')
        .in('status', ['scheduled', 'confirmed', 'completed']);

      if (appointmentsError) throw appointmentsError;

      // Calculate booked hours
      let bookedHours = 0;
      (appointments || []).forEach(apt => {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);
        bookedHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      });

      if (totalAvailableHours === 0) return 0;

      return Math.min(100, Math.round((bookedHours / totalAvailableHours) * 100));
    },
    enabled: !!clinicId,
  });

  // Calculate conversion metrics
  const scheduled = appointmentStats?.scheduled || 0;
  const completed = appointmentStats?.completed || 0;
  const paid = appointmentStats?.paid || 0;

  const prevScheduled = prevAppointmentStats?.scheduled || 0;
  const prevCompleted = prevAppointmentStats?.completed || 0;

  const currentConversion = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  const prevConversion = prevScheduled > 0 ? Math.round((prevCompleted / prevScheduled) * 100) : 0;
  const conversionGrowth = currentConversion - prevConversion;

  const conversionData: ConversionData[] = [
    { name: 'Записались', value: scheduled > 0 ? 100 : 0, color: 'hsl(var(--primary))' },
    { name: 'Пришли', value: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0, color: 'hsl(var(--chart-2))' },
    { name: 'Оплатили', value: scheduled > 0 ? Math.round((paid / scheduled) * 100) : 0, color: 'hsl(var(--chart-3))' },
  ];

  const isLoading = revenueLoading || appointmentsLoading || servicesLoading;

  return {
    revenueData: revenueByDay || [],
    conversionData,
    servicesData: servicesStats || [],
    kpis: {
      conversionRate: currentConversion,
      conversionGrowth,
      averageCheck: avgCheckData || 0,
      newPatients: newPatientsCount || 0,
      doctorWorkload: doctorWorkload || 0,
    },
    isLoading,
    error: null,
  };
}
