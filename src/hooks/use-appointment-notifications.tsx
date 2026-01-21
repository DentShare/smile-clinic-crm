import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { differenceInMinutes, format } from 'date-fns';
import type { Appointment, Patient } from '@/types/database';

interface UseAppointmentNotificationsOptions {
  appointments: (Appointment & { patient: Patient })[];
  enabled?: boolean;
  notifyMinutesBefore?: number;
}

export function useAppointmentNotifications({
  appointments,
  enabled = true,
  notifyMinutesBefore = 15,
}: UseAppointmentNotificationsOptions) {
  const notifiedIds = useRef<Set<string>>(new Set());

  const checkUpcomingAppointments = useCallback(() => {
    if (!enabled || !appointments.length) return;

    const now = new Date();

    appointments.forEach((appointment) => {
      // Only check scheduled/confirmed appointments
      if (!['scheduled', 'confirmed'].includes(appointment.status)) return;
      
      // Skip if already notified
      if (notifiedIds.current.has(appointment.id)) return;

      const startTime = new Date(appointment.start_time);
      const minutesUntil = differenceInMinutes(startTime, now);

      // Notify if within the notification window (0-15 minutes before)
      if (minutesUntil >= 0 && minutesUntil <= notifyMinutesBefore) {
        notifiedIds.current.add(appointment.id);
        
        const timeStr = format(startTime, 'HH:mm');
        
        toast.info(`Скоро приём: ${appointment.patient?.full_name}`, {
          description: `В ${timeStr} (через ${minutesUntil} мин)`,
          duration: 10000,
          action: {
            label: 'Открыть',
            onClick: () => {
              // Could navigate to appointment detail
            },
          },
        });
      }
    });
  }, [appointments, enabled, notifyMinutesBefore]);

  useEffect(() => {
    // Check immediately on mount/update
    checkUpcomingAppointments();

    // Check every minute
    const interval = setInterval(checkUpcomingAppointments, 60000);

    return () => clearInterval(interval);
  }, [checkUpcomingAppointments]);

  // Reset notified IDs when appointments change significantly (e.g., date change)
  useEffect(() => {
    const currentIds = new Set(appointments.map(a => a.id));
    
    // Remove IDs that are no longer in appointments
    notifiedIds.current.forEach(id => {
      if (!currentIds.has(id)) {
        notifiedIds.current.delete(id);
      }
    });
  }, [appointments]);

  return {
    notifiedIds: notifiedIds.current,
  };
}
