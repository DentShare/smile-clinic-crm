import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface WorkingHours {
  workStart: number;
  workEnd: number;
  isWorkingDay: boolean;
}

const DEFAULT_WORK_START = 9;
const DEFAULT_WORK_END = 18;

/**
 * Hook to fetch clinic or doctor working hours for a specific date
 * Returns { workStart, workEnd, isWorkingDay, isLoading }
 */
export function useWorkingHours(date: Date, doctorId?: string) {
  const { clinic } = useAuth();
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!clinic?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // First try to get doctor-specific schedule, then fall back to clinic schedule
      const scheduleId = doctorId || '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('doctor_id', scheduleId);

      if (error) {
        console.error('Error fetching schedules:', error);
        setIsLoading(false);
        return;
      }

      // If doctor-specific schedule not found, get clinic default
      if ((!data || data.length === 0) && doctorId) {
        const { data: clinicData } = await supabase
          .from('doctor_schedules')
          .select('*')
          .eq('clinic_id', clinic.id)
          .eq('doctor_id', '00000000-0000-0000-0000-000000000000');
        
        setSchedules(clinicData || []);
      } else {
        setSchedules(data || []);
      }

      setIsLoading(false);
    };

    fetchSchedules();
  }, [clinic?.id, doctorId]);

  const workingHours: WorkingHours = useMemo(() => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);

    if (!schedule) {
      // Default schedule if none found
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      return {
        workStart: DEFAULT_WORK_START,
        workEnd: DEFAULT_WORK_END,
        isWorkingDay: isWeekday,
      };
    }

    if (!schedule.is_working) {
      return {
        workStart: DEFAULT_WORK_START,
        workEnd: DEFAULT_WORK_END,
        isWorkingDay: false,
      };
    }

    // Parse time strings like "09:00" to hours
    const parseHour = (timeStr: string) => {
      const [hours] = timeStr.split(':').map(Number);
      return hours;
    };

    return {
      workStart: parseHour(schedule.start_time),
      workEnd: parseHour(schedule.end_time),
      isWorkingDay: true,
    };
  }, [schedules, date]);

  return {
    ...workingHours,
    isLoading,
    schedules,
  };
}

/**
 * Hook to get the overall clinic working hours range (min start, max end across all days)
 * Useful for showing consistent grid across the week
 */
export function useClinicWorkingHoursRange() {
  const { clinic } = useAuth();
  const [range, setRange] = useState({ minStart: DEFAULT_WORK_START, maxEnd: DEFAULT_WORK_END });
  const [allSchedules, setAllSchedules] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!clinic?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Get clinic-wide schedule
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('doctor_id', '00000000-0000-0000-0000-000000000000');

      if (error || !data || data.length === 0) {
        setIsLoading(false);
        return;
      }

      setAllSchedules(data);

      // Find min start and max end across all working days
      const workingDays = data.filter(s => s.is_working);
      
      if (workingDays.length === 0) {
        setIsLoading(false);
        return;
      }

      const parseHour = (timeStr: string) => {
        const [hours] = timeStr.split(':').map(Number);
        return hours;
      };

      const starts = workingDays.map(s => parseHour(s.start_time));
      const ends = workingDays.map(s => parseHour(s.end_time));

      setRange({
        minStart: Math.min(...starts),
        maxEnd: Math.max(...ends),
      });

      setIsLoading(false);
    };

    fetchSchedules();
  }, [clinic?.id]);

  // Helper to check if specific date is a working day
  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const schedule = allSchedules.find(s => s.day_of_week === dayOfWeek);
    return schedule?.is_working ?? (dayOfWeek >= 1 && dayOfWeek <= 5);
  };

  // Get specific day's hours
  const getDayHours = (date: Date): { start: number; end: number; isWorking: boolean } => {
    const dayOfWeek = date.getDay();
    const schedule = allSchedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) {
      return { 
        start: DEFAULT_WORK_START, 
        end: DEFAULT_WORK_END, 
        isWorking: dayOfWeek >= 1 && dayOfWeek <= 5 
      };
    }

    const parseHour = (timeStr: string) => {
      const [hours] = timeStr.split(':').map(Number);
      return hours;
    };

    return {
      start: parseHour(schedule.start_time),
      end: parseHour(schedule.end_time),
      isWorking: schedule.is_working,
    };
  };

  return {
    workStart: range.minStart,
    workEnd: range.maxEnd,
    isLoading,
    isWorkingDay,
    getDayHours,
    allSchedules,
  };
}
