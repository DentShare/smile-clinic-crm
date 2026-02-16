import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import type { ClinicTenant, SuperAdminKPIs, AcquisitionData } from '@/types/superAdmin';

export function useSuperAdminData() {
  const [clinics, setClinics] = useState<ClinicTenant[]>([]);
  const [kpis, setKpis] = useState<SuperAdminKPIs>({
    mrr: 0,
    mrrGrowth: 0,
    activeClinics: 0,
    trialExpiring: 0,
    churnRate: 0,
    totalClinics: 0,
  });
  const [acquisitionData, setAcquisitionData] = useState<AcquisitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClinics = useCallback(async () => {
    try {
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select(`
          id,
          name,
          subdomain,
          owner_name,
          phone,
          email,
          inn,
          is_active,
          country,
          acquisition_source,
          acquisition_campaign,
          admin_notes,
          created_at,
          updated_at,
          clinic_subscriptions (
            id,
            status,
            plan_id,
            trial_ends_at,
            current_period_end,
            subscription_plans (
              name,
              name_ru,
              price_monthly
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (clinicsError) throw clinicsError;

      const formattedClinics: ClinicTenant[] = (clinicsData || []).map((clinic: any) => {
        const sub = clinic.clinic_subscriptions;
        const plan = sub?.subscription_plans;
        
        return {
          id: clinic.id,
          name: clinic.name,
          subdomain: clinic.subdomain,
          owner_name: clinic.owner_name,
          owner_phone: clinic.phone,
          phone: clinic.phone,
          email: clinic.email,
          inn: clinic.inn,
          is_active: clinic.is_active,
          country: clinic.country || 'UZ',
          acquisition_source: clinic.acquisition_source,
          acquisition_campaign: clinic.acquisition_campaign,
          admin_notes: clinic.admin_notes,
          created_at: clinic.created_at,
          updated_at: clinic.updated_at,
          subscription: sub ? {
            id: sub.id,
            status: sub.status || 'trial',
            plan_id: sub.plan_id,
            plan_name: plan?.name || 'Unknown',
            plan_name_ru: plan?.name_ru || 'Неизвестно',
            price_monthly: plan?.price_monthly || 0,
            trial_ends_at: sub.trial_ends_at,
            current_period_end: sub.current_period_end,
          } : null,
        };
      });

      setClinics(formattedClinics);
      return formattedClinics;
    } catch (err) {
      console.error('Error fetching clinics:', err);
      setError('Failed to fetch clinics');
      return [];
    }
  }, []);

  const calculateKPIs = useCallback(async (clinicsData: ClinicTenant[]) => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    let mrr = 0;
    let activeClinics = 0;
    let trialExpiring = 0;
    let cancelledCount = 0;
    
    clinicsData.forEach(clinic => {
      const sub = clinic.subscription;
      if (!sub) return;
      
      if (sub.status === 'active') {
        mrr += sub.price_monthly;
        activeClinics++;
      }
      
      if (sub.status === 'trial' && sub.trial_ends_at) {
        const trialEnd = new Date(sub.trial_ends_at);
        if (trialEnd <= threeDaysFromNow && trialEnd >= now) {
          trialExpiring++;
        }
      }
      
      if (sub.status === 'cancelled' || sub.status === 'blocked') {
        cancelledCount++;
      }
    });
    
    // Calculate churn rate (cancelled / total * 100)
    const totalWithSub = clinicsData.filter(c => c.subscription).length;
    const churnRate = totalWithSub > 0 ? (cancelledCount / totalWithSub) * 100 : 0;
    
    // Get last month's MRR for growth calculation
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const { data: lastMonthBilling } = await supabase
      .from('billing_history')
      .select('amount')
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())
      .eq('status', 'paid');
    
    const lastMonthMRR = lastMonthBilling?.reduce((sum, b) => sum + Number(b.amount), 0) ?? mrr * 0.9;
    const mrrGrowth = lastMonthMRR > 0 ? ((mrr - lastMonthMRR) / lastMonthMRR) * 100 : 0;
    
    setKpis({
      mrr,
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      activeClinics,
      trialExpiring,
      churnRate: Math.round(churnRate * 10) / 10,
      totalClinics: clinicsData.length,
    });
  }, []);

  const calculateAcquisitionData = useCallback((clinicsData: ClinicTenant[]) => {
    const sourceMap: Record<string, { signups: number; converted: number }> = {};
    
    clinicsData.forEach(clinic => {
      const source = clinic.acquisition_source || 'other';
      if (!sourceMap[source]) {
        sourceMap[source] = { signups: 0, converted: 0 };
      }
      sourceMap[source].signups++;
      if (clinic.subscription?.status === 'active') {
        sourceMap[source].converted++;
      }
    });
    
    const data: AcquisitionData[] = Object.entries(sourceMap).map(([source, stats]) => ({
      source,
      signups: stats.signups,
      converted: stats.converted,
      conversionRate: stats.signups > 0 ? Math.round((stats.converted / stats.signups) * 100) : 0,
    }));
    
    setAcquisitionData(data.sort((a, b) => b.signups - a.signups));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const clinicsData = await fetchClinics();
    await calculateKPIs(clinicsData);
    calculateAcquisitionData(clinicsData);
    setLoading(false);
  }, [fetchClinics, calculateKPIs, calculateAcquisitionData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    clinics,
    kpis,
    acquisitionData,
    loading,
    error,
    refresh,
  };
}
