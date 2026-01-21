import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
        .single();

      if (profileData) {
        setProfile(profileData as Profile);

        // Fetch clinic if user belongs to one
        if (profileData.clinic_id) {
          const { data: clinicData } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', profileData.clinic_id)
            .single();

          if (clinicData) {
            setClinic(clinicData as Clinic);
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
    // IMPORTANT: subscribe FIRST, then read the existing session.
    // Also: keep the auth callback synchronous to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer any Supabase reads to the next tick.
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setClinic(null);
        setRoles([]);
      }
    });

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserData(session.user.id);
        }
      })
      .finally(() => setIsLoading(false));

    return () => subscription.unsubscribe();
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
