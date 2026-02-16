import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLogEntry {
  id: string;
  clinic_id: string | null;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  // Joined
  user_name?: string;
}

interface AuditLogFilters {
  action?: string;
  tableName?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const TABLE_LABELS: Record<string, string> = {
  patients: 'Пациенты',
  appointments: 'Приёмы',
  payments: 'Платежи',
  performed_works: 'Выполненные работы',
  services: 'Услуги',
  inventory: 'Склад',
  profiles: 'Профили',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
  LOGIN: 'Вход',
  LOGOUT: 'Выход',
  PAYMENT_PROCESSED: 'Оплата проведена',
  PATIENT_CREATED: 'Пациент создан',
  APPOINTMENT_CREATED: 'Приём создан',
  TREATMENT_COMPLETED: 'Лечение завершено',
  USER_INVITED: 'Приглашение',
  ROLE_CHANGED: 'Смена роли',
  CLINIC_SETTINGS_UPDATED: 'Настройки изменены',
};

export const getTableLabel = (table: string) => TABLE_LABELS[table] || table;
export const getActionLabel = (action: string) => ACTION_LABELS[action] || action;

export function useAuditLog(filters: AuditLogFilters, page = 0, pageSize = 50) {
  const { clinic } = useAuth();

  return useQuery({
    queryKey: ['audit-log', clinic?.id, filters, page, pageSize],
    queryFn: async () => {
      if (!clinic?.id) return { data: [] as AuditLogEntry[], count: 0 };

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Fetch user names for the logs
      const userIds = [...new Set((data || []).map(d => d.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        if (profiles) {
          userMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      const entries: AuditLogEntry[] = (data || []).map(d => ({
        ...d,
        old_values: d.old_values as Record<string, unknown> | null,
        new_values: d.new_values as Record<string, unknown> | null,
        user_name: userMap[d.user_id] || 'Система',
      }));

      return { data: entries, count: count || 0 };
    },
    enabled: !!clinic?.id,
  });
}
