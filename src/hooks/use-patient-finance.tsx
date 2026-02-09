import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useToast } from '@/hooks/use-toast';

export interface FinanceSummary {
  patient_id: string;
  total_treatment_cost: number;
  total_paid: number;
  current_balance: number;
  current_debt: number;
  advance: number;
  planned_cost: number;
}

export interface LedgerEntry {
  id: string;
  type: 'credit' | 'debit';
  event_type: 'charge' | 'payment' | 'refund' | 'adjustment' | 'plan_created';
  description: string;
  amount: number;
  date: string;
  created_at: string;
  balance_after: number;
  is_fiscalized?: boolean;
  fiscal_url?: string;
  notes?: string;
  tooth_number?: number;
  quantity?: number;
  unit_price?: number;
  discount?: number;
}

export interface CompleteServicesResult {
  success: boolean;
  completed_count?: number;
  total_amount?: number;
  new_balance?: number;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  payment_id?: string;
  amount?: number;
  new_balance?: number;
  error?: string;
}

export function usePatientFinance(patientId?: string) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financialState, setFinancialState] = useState<FinanceSummary | null>(null);

  // Fetch financial summary
  const fetchSummary = useCallback(async (pId?: string) => {
    const id = pId || patientId;
    if (!id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_patient_finance_summary', {
        p_patient_id: id
      });

      if (rpcError) throw rpcError;
      
      const result = data as unknown as FinanceSummary;
      setSummary(result);
      setFinancialState(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch summary';
      setError(message);
      console.error('[usePatientFinance] fetchSummary error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Alias for backward compatibility
  const fetchFinancialState = fetchSummary;

  // Fetch detailed ledger
  const fetchLedger = useCallback(async (pId?: string, limit = 50, offset = 0) => {
    const id = pId || patientId;
    if (!id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch payments from database
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, payment_method, is_fiscalized, fiscal_check_url, notes, created_at')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      const { data: worksData } = await supabase
        .from('performed_works')
        .select(`
          id,
          total,
          tooth_number,
          quantity,
          price,
          discount_percent,
          created_at,
          service:service_id (name)
        `)
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      const payments = paymentsData || [];
      const works = worksData || [];

      // Combine and format
      const combined: LedgerEntry[] = [
        ...payments.map(p => ({
          id: p.id,
          type: 'credit' as const,
          event_type: 'payment' as const,
          description: `Оплата (${p.payment_method || 'Наличные'})`,
          amount: Number(p.amount),
          date: p.created_at || new Date().toISOString(),
          created_at: p.created_at || new Date().toISOString(),
          balance_after: 0,
          is_fiscalized: p.is_fiscalized || false,
          fiscal_url: p.fiscal_check_url || undefined,
          notes: p.notes || undefined
        })),
        ...works.map(w => ({
          id: w.id,
          type: 'debit' as const,
          event_type: 'charge' as const,
          description: (w.service as unknown as { name: string })?.name || 'Услуга',
          amount: -Number(w.total),
          date: w.created_at || new Date().toISOString(),
          created_at: w.created_at || new Date().toISOString(),
          balance_after: 0,
          tooth_number: w.tooth_number || undefined,
          quantity: w.quantity,
          unit_price: Number(w.price),
          discount: Number(w.discount_percent)
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      const ledgerWithBalance = [...combined].reverse().map(item => {
        runningBalance += item.amount;
        return { ...item, balance_after: runningBalance };
      }).reverse();

      setLedger(ledgerWithBalance.slice(offset, offset + limit));
      setLedgerTotal(combined.length);
      return { ledger: ledgerWithBalance, total: combined.length, current_balance: runningBalance };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch ledger';
      setError(message);
      console.error('[usePatientFinance] fetchLedger error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Load more ledger entries
  const loadMoreLedger = useCallback(async (pId: string, limit: number, offset: number) => {
    const result = await fetchLedger(pId, limit + offset, 0);
    if (result) {
      setLedger(result.ledger.slice(0, limit + offset));
    }
  }, [fetchLedger]);

  // Complete services from treatment plan
  const completeServices = useCallback(async (
    appointmentId: string,
    itemIds: string[],
    doctorId: string
  ): Promise<CompleteServicesResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('complete_treatment_services', {
        p_appointment_id: appointmentId,
        p_item_ids: itemIds,
        p_doctor_id: doctorId
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as CompleteServicesResult;
      
      if (result.success) {
        toast({
          title: 'Услуги выполнены',
          description: `Выполнено ${result.completed_count} услуг на сумму ${result.total_amount?.toLocaleString()} сум`,
        });
        // Refresh summary
        if (patientId) await fetchSummary();
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete services';
      setError(message);
      toast({
        title: 'Ошибка',
        description: message,
        variant: 'destructive'
      });
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [patientId, fetchSummary, toast]);

  // Process payment
  const processPayment = useCallback(async (
    pId: string,
    amount: number,
    method: string,
    options?: {
      appointmentId?: string;
      fiscalCheckUrl?: string;
      notes?: string;
    }
  ): Promise<PaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      // Get clinic_id from user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, clinic_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.clinic_id) throw new Error('No clinic associated');

      const { data, error: rpcError } = await supabase.rpc('process_patient_payment', {
        p_clinic_id: profile.clinic_id,
        p_patient_id: pId,
        p_amount: amount,
        p_method: method,
        p_appointment_id: options?.appointmentId || null,
        p_fiscal_check_url: options?.fiscalCheckUrl || null,
        p_notes: options?.notes || null,
        p_received_by: profile.id
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as PaymentResult;

      if (result.success) {
        toast({
          title: 'Оплата принята',
          description: `Сумма: ${amount.toLocaleString()} сум. Новый баланс: ${result.new_balance?.toLocaleString()} сум`,
        });
        // Refresh summary
        await fetchSummary(pId);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process payment';
      setError(message);
      toast({
        title: 'Ошибка оплаты',
        description: message,
        variant: 'destructive'
      });
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, toast]);

  // Calculate balance directly
  const calculateBalance = useCallback(async (pId?: string): Promise<number | null> => {
    const id = pId || patientId;
    if (!id) return null;

    try {
      const { data, error } = await supabase.rpc('calculate_patient_balance', {
        p_patient_id: id
      });

      if (error) throw error;
      return data as number;
    } catch {
      return null;
    }
  }, [patientId]);

  return {
    summary,
    ledger,
    ledgerTotal,
    loading,
    error,
    financialState,
    fetchSummary,
    fetchFinancialState,
    fetchLedger,
    loadMoreLedger,
    completeServices,
    processPayment,
    calculateBalance,
  };
}
