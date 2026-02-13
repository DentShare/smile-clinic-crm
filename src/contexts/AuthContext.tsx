import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/clientRuntime';
import type { AppRole, Profile, Clinic } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  clinic: Clinic | null;
  roles: AppRole[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isClinicAdmin: boolean;
  isDoctor: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        const mappedProfile: Profile = {
          ...profileData,
          is_active: profileData.is_active ?? true,
          created_at: profileData.created_at ?? new Date().toISOString(),
          updated_at: profileData.updated_at ?? new Date().toISOString(),
        };
        setProfile(mappedProfile);

        // Fetch clinic if user belongs to one
        if (profileData.clinic_id) {
          const { data: clinicData } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', profileData.clinic_id)
            .maybeSingle();

          if (clinicData) {
            const mappedClinic: Clinic = {
              ...clinicData,
              is_active: clinicData.is_active ?? true,
              settings: clinicData.settings as Clinic['settings'],
              created_at: clinicData.created_at ?? new Date().toISOString(),
              updated_at: clinicData.updated_at ?? new Date().toISOString(),
            };
            setClinic(mappedClinic);
          }
        }
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // IMPORTANT: subscribe FIRST, then read the existing session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setClinic(null);
        setRoles([]);
      }
    });

    // Get initial session — keep isLoading true until fetchUserData finishes
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (!error && data.user) {
      // Create profile
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        full_name: fullName
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setClinic(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const value: AuthContextType = {
    user,
    session,
    profile,
    clinic,
    roles,
    isLoading,
    isSuperAdmin: hasRole('super_admin'),
    isClinicAdmin: hasRole('clinic_admin'),
    isDoctor: hasRole('doctor'),
    signIn,
    signUp,
    signOut,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
