import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { RolePermission } from '@/types/database';

// All available permission keys
export const PERMISSION_KEYS = [
  'patients.view',
  'patients.edit',
  'finance.view',
  'finance.manage',
  'inventory.view',
  'inventory.manage',
  'schedule.view',
  'schedule.manage',
  'settings.manage',
  'reports.view',
  'reports.export',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

// Human-readable labels
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'patients.view': 'Просмотр пациентов',
  'patients.edit': 'Редактирование пациентов',
  'finance.view': 'Просмотр финансов',
  'finance.manage': 'Управление финансами',
  'inventory.view': 'Просмотр склада',
  'inventory.manage': 'Управление складом',
  'schedule.view': 'Просмотр расписания',
  'schedule.manage': 'Управление расписанием',
  'settings.manage': 'Управление настройками',
  'reports.view': 'Просмотр отчётов',
  'reports.export': 'Экспорт отчётов',
};

// Permission groups for UI
export const PERMISSION_GROUPS = [
  { key: 'patients', label: 'Пациенты', permissions: ['patients.view', 'patients.edit'] },
  { key: 'finance', label: 'Финансы', permissions: ['finance.view', 'finance.manage'] },
  { key: 'inventory', label: 'Склад', permissions: ['inventory.view', 'inventory.manage'] },
  { key: 'schedule', label: 'Расписание', permissions: ['schedule.view', 'schedule.manage'] },
  { key: 'reports', label: 'Отчёты', permissions: ['reports.view', 'reports.export'] },
  { key: 'settings', label: 'Настройки', permissions: ['settings.manage'] },
] as const;

// Roles that can be configured
export const CONFIGURABLE_ROLES = [
  { key: 'doctor', label: 'Врач' },
  { key: 'reception', label: 'Ресепшн' },
  { key: 'nurse', label: 'Ассистент' },
] as const;

// Default permissions per role (used when no custom config exists)
const DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  clinic_admin: PERMISSION_KEYS as unknown as PermissionKey[],
  doctor: ['patients.view', 'patients.edit', 'schedule.view', 'schedule.manage', 'reports.view'],
  reception: ['patients.view', 'patients.edit', 'finance.view', 'finance.manage', 'schedule.view', 'schedule.manage', 'inventory.view'],
  nurse: ['patients.view', 'schedule.view'],
};

export function usePermissions() {
  const { clinic, profile, isClinicAdmin, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clinic?.id) fetchPermissions();
  }, [clinic?.id]);

  const fetchPermissions = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('clinic_id', clinic.id);
    if (!error) setPermissions(data || []);
    setLoading(false);
  };

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    // Super admin and clinic admin always have all permissions
    if (isClinicAdmin) return true;

    // Determine current role
    const role = profile?.specialization === 'nurse' || hasRole('nurse')
      ? 'nurse'
      : hasRole('doctor')
        ? 'doctor'
        : hasRole('reception')
          ? 'reception'
          : 'doctor';

    // Check custom permissions first
    const custom = permissions.find(p => p.role === role && p.permission === permission);
    if (custom) return custom.granted;

    // Fall back to defaults
    return DEFAULT_PERMISSIONS[role]?.includes(permission) ?? false;
  }, [permissions, isClinicAdmin, profile, hasRole]);

  const setPermission = async (role: string, permission: string, granted: boolean) => {
    if (!clinic?.id) return;

    // Upsert the permission
    const existing = permissions.find(p => p.role === role && p.permission === permission);
    if (existing) {
      const { error } = await supabase
        .from('role_permissions')
        .update({ granted })
        .eq('id', existing.id);
      if (error) {
        toast_error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('role_permissions')
        .insert({ clinic_id: clinic.id, role, permission, granted });
      if (error) {
        toast_error(error.message);
        return;
      }
    }
    await fetchPermissions();
  };

  const getPermissionForRole = (role: string, permission: string): boolean => {
    const custom = permissions.find(p => p.role === role && p.permission === permission);
    if (custom) return custom.granted;
    return DEFAULT_PERMISSIONS[role]?.includes(permission as PermissionKey) ?? false;
  };

  return {
    permissions,
    loading,
    hasPermission,
    setPermission,
    getPermissionForRole,
    fetchPermissions,
  };
}

function toast_error(msg: string) {
  // Lazy import to avoid circular deps
  import('sonner').then(({ toast }) => toast.error('Ошибка: ' + msg));
}
