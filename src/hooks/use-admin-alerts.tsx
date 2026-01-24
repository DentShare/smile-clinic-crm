import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { differenceInDays, parseISO } from 'date-fns';

export interface AdminAlert {
  id: string;
  type: 'trial_expiring' | 'subscription_expired' | 'payment_overdue' | 'new_signup' | 'churn_risk';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  clinicId: string;
  clinicName: string;
  createdAt: Date;
  data?: Record<string, any>;
}

export const useAdminAlerts = () => {
  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const { data: clinics, error } = await supabase
        .from('clinics')
        .select(`
          *,
          subscription:clinic_subscriptions(
            *,
            plan:subscription_plans(*)
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const generatedAlerts: AdminAlert[] = [];
      const now = new Date();

      clinics?.forEach((clinic: any) => {
        const subscription = clinic.subscription?.[0];
        
        if (!subscription) return;

        // Trial expiring in < 3 days
        if (subscription.status === 'trial' && subscription.trial_ends_at) {
          const trialEnd = parseISO(subscription.trial_ends_at);
          const daysLeft = differenceInDays(trialEnd, now);
          
          if (daysLeft <= 3 && daysLeft >= 0) {
            generatedAlerts.push({
              id: `trial-${clinic.id}`,
              type: 'trial_expiring',
              severity: daysLeft <= 1 ? 'critical' : 'warning',
              title: `Триал заканчивается${daysLeft === 0 ? ' сегодня' : ` через ${daysLeft} дн.`}`,
              description: `Клиника "${clinic.name}" - свяжитесь для конверсии`,
              clinicId: clinic.id,
              clinicName: clinic.name,
              createdAt: now,
              data: { daysLeft, ownerPhone: clinic.phone }
            });
          }
        }

        // Subscription expired (past_due)
        if (subscription.current_period_end) {
          const periodEnd = parseISO(subscription.current_period_end);
          const daysOverdue = differenceInDays(now, periodEnd);
          
          if (daysOverdue > 0 && subscription.status !== 'cancelled') {
            generatedAlerts.push({
              id: `expired-${clinic.id}`,
              type: 'subscription_expired',
              severity: daysOverdue > 7 ? 'critical' : 'warning',
              title: `Подписка просрочена на ${daysOverdue} дн.`,
              description: `Клиника "${clinic.name}" - требуется оплата или блокировка`,
              clinicId: clinic.id,
              clinicName: clinic.name,
              createdAt: now,
              data: { daysOverdue, ownerPhone: clinic.phone }
            });
          }
        }

        // Subscription ending soon (within 5 days)
        if (subscription.status === 'active' && subscription.current_period_end) {
          const periodEnd = parseISO(subscription.current_period_end);
          const daysLeft = differenceInDays(periodEnd, now);
          
          if (daysLeft <= 5 && daysLeft >= 0) {
            generatedAlerts.push({
              id: `ending-${clinic.id}`,
              type: 'payment_overdue',
              severity: daysLeft <= 2 ? 'warning' : 'info',
              title: `Подписка истекает${daysLeft === 0 ? ' сегодня' : ` через ${daysLeft} дн.`}`,
              description: `Клиника "${clinic.name}" - напомнить об оплате`,
              clinicId: clinic.id,
              clinicName: clinic.name,
              createdAt: now,
              data: { daysLeft, ownerPhone: clinic.phone }
            });
          }
        }
      });

      // Sort by severity
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return generatedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return { alerts, isLoading, refetch };
};
