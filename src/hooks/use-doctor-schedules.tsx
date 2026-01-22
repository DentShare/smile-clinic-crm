import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorDaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface DoctorScheduleInfo {
  doctorId: string;
  schedules: DoctorDaySchedule[];
}

// Helper to parse time string to hour number
const parseHour = (timeStr: string): number => {
  const [hours] = timeStr.split(':').map(Number);
  return hours;
};

/**
 * Hook to get all doctor schedules for the clinic
 * Returns schedules mapped by doctor user_id
 */
export function useDoctorSchedules() {
  const { clinic } = useAuth();
  const [schedules, setSchedules] = useState<Record<string, DoctorDaySchedule[]>>({});
  const [clinicSchedule, setClinicSchedule] = useState<DoctorDaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!clinic?.id) return;

      try {
        // Fetch all schedules for this clinic
        const { data, error } = await supabase
          .from('doctor_schedules')
          .select('*')
          .eq('clinic_id', clinic.id);

        if (error) throw error;

        const byDoctor: Record<string, DoctorDaySchedule[]> = {};
        const clinicDefault: DoctorDaySchedule[] = [];

        (data || []).forEach((schedule) => {
          const daySchedule: DoctorDaySchedule = {
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_working: schedule.is_working ?? true,
          };

          // Check if it's clinic-wide schedule (null UUID)
          if (schedule.doctor_id === '00000000-0000-0000-0000-000000000000') {
            clinicDefault.push(daySchedule);
          } else {
            if (!byDoctor[schedule.doctor_id]) {
              byDoctor[schedule.doctor_id] = [];
            }
            byDoctor[schedule.doctor_id].push(daySchedule);
          }
        });

        setSchedules(byDoctor);
        setClinicSchedule(clinicDefault);
      } catch (error) {
        console.error('Error fetching doctor schedules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [clinic?.id]);

  /**
   * Get work hours for a specific doctor on a specific day
   * Falls back to clinic schedule if no personal schedule exists
   */
  const getDoctorWorkHours = (doctorId: string, dayOfWeek: number) => {
    // First check doctor's personal schedule
    const doctorSchedule = schedules[doctorId]?.find(s => s.day_of_week === dayOfWeek);
    if (doctorSchedule) {
      return {
        isWorking: doctorSchedule.is_working,
        startHour: parseHour(doctorSchedule.start_time),
        endHour: parseHour(doctorSchedule.end_time),
      };
    }

    // Fall back to clinic schedule
    const clinicDay = clinicSchedule.find(s => s.day_of_week === dayOfWeek);
    if (clinicDay) {
      return {
        isWorking: clinicDay.is_working,
        startHour: parseHour(clinicDay.start_time),
        endHour: parseHour(clinicDay.end_time),
      };
    }

    // Default fallback
    return {
      isWorking: dayOfWeek >= 1 && dayOfWeek <= 5,
      startHour: 9,
      endHour: 18,
    };
  };

  /**
   * Check if a doctor is working on a specific day
   */
  const isDoctorWorkingOnDay = (doctorId: string, dayOfWeek: number): boolean => {
    return getDoctorWorkHours(doctorId, dayOfWeek).isWorking;
  };

  /**
   * Get the work time range for a doctor on a specific day
   */
  const getDoctorTimeRange = (doctorId: string, dayOfWeek: number) => {
    const hours = getDoctorWorkHours(doctorId, dayOfWeek);
    return {
      start: hours.startHour,
      end: hours.endHour,
      isWorking: hours.isWorking,
    };
  };

  return {
    schedules,
    clinicSchedule,
    isLoading,
    getDoctorWorkHours,
    isDoctorWorkingOnDay,
    getDoctorTimeRange,
  };
}
