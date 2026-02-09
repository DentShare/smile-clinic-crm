import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/database';

interface StaffScopeResult {
  /** Doctor IDs this user can see (null = see all) */
  visibleDoctorIds: string[] | null;
  /** Whether this user has full visibility */
  hasFullAccess: boolean;
  /** All staff for admin filtering */
  allStaff: Pick<Profile, 'id' | 'full_name' | 'specialization'>[];
  /** Currently selected doctor filter (for admin/director) */
  selectedDoctorId: string | null;
  /** Set the filter (null = "all") */
  setSelectedDoctorId: (id: string | null) => void;
  /** The effective doctor IDs to filter by in queries */
  effectiveDoctorIds: string[] | null;
  isLoading: boolean;
}

/**
 * Determines which doctor's data the current user can see.
 * - doctor: only their own profile id
 * - nurse: profile ids of linked doctors
 * - clinic_admin / reception: all (with optional filter)
 */
export function useStaffScope(): StaffScopeResult {
  const { clinic, profile, isClinicAdmin, hasRole } = useAuth();
  const [linkedDoctorIds, setLinkedDoctorIds] = useState<string[]>([]);
  const [allStaff, setAllStaff] = useState<Pick<Profile, 'id' | 'full_name' | 'specialization'>[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDoctor = hasRole('doctor');
  const isNurse = hasRole('nurse');
  const isAdmin = isClinicAdmin || hasRole('reception');

  useEffect(() => {
    if (!clinic?.id || !profile?.id) return;

    const load = async () => {
      setIsLoading(true);

      // If admin, load all doctors for filter tabs
      if (isAdmin) {
        const { data: doctors } = await supabase
          .from('profiles')
          .select('id, full_name, specialization')
          .eq('clinic_id', clinic.id)
          .eq('is_active', true)
          .order('full_name');

        // Filter to only doctors by checking user_roles
        const { data: doctorRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'doctor');

        const doctorUserIds = new Set((doctorRoles || []).map(r => r.user_id));
        const doctorProfiles = (doctors || []).filter(d => {
          // We need to match profile.user_id - but we only have profile.id
          // So we need to fetch with user_id
          return true; // Will filter below
        });

        // Re-fetch with user_id to properly filter
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, specialization, user_id')
          .eq('clinic_id', clinic.id)
          .eq('is_active', true)
          .order('full_name');

        const filteredDoctors = (allProfiles || [])
          .filter(p => doctorUserIds.has(p.user_id))
          .map(({ id, full_name, specialization }) => ({ id, full_name, specialization }));

        setAllStaff(filteredDoctors);
      }

      // If nurse, load linked doctor IDs
      if (isNurse) {
        const { data: links } = await supabase
          .from('doctor_assistants')
          .select('doctor_id')
          .eq('assistant_id', profile.id)
          .eq('clinic_id', clinic.id);

        setLinkedDoctorIds((links || []).map(l => l.doctor_id));
      }

      setIsLoading(false);
    };

    load();
  }, [clinic?.id, profile?.id, isAdmin, isNurse]);

  const hasFullAccess = isAdmin;

  const visibleDoctorIds = useMemo(() => {
    if (isAdmin) return null; // see all
    if (isDoctor && profile) return [profile.id];
    if (isNurse) return linkedDoctorIds;
    return [];
  }, [isAdmin, isDoctor, isNurse, profile, linkedDoctorIds]);

  // Effective filter: for admins with a selection, or for scoped users
  const effectiveDoctorIds = useMemo(() => {
    if (isAdmin) {
      return selectedDoctorId ? [selectedDoctorId] : null; // null = all
    }
    return visibleDoctorIds;
  }, [isAdmin, selectedDoctorId, visibleDoctorIds]);

  return {
    visibleDoctorIds,
    hasFullAccess,
    allStaff,
    selectedDoctorId,
    setSelectedDoctorId,
    effectiveDoctorIds,
    isLoading,
  };
}
