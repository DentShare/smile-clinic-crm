import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { CashRegister, CashRegisterOperation } from '@/types/database';
import { toast } from 'sonner';

export function useCashRegisters() {
  const { clinic } = useAuth();
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [operations, setOperations] = useState<CashRegisterOperation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegisters = useCallback(async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching cash registers:', error);
      return;
    }
    setRegisters(data || []);
  }, [clinic?.id]);

  const fetchOperations = useCallback(async (registerId?: string, limit = 50) => {
    if (!clinic?.id) return;
    let query = supabase
      .from('cash_register_operations')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (registerId) {
      query = query.eq('cash_register_id', registerId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching operations:', error);
      return;
    }
    setOperations(data || []);
  }, [clinic?.id]);

  useEffect(() => {
    if (clinic?.id) {
      setLoading(true);
      Promise.all([fetchRegisters(), fetchOperations()]).finally(() => setLoading(false));
    }
  }, [clinic?.id, fetchRegisters, fetchOperations]);

  const createRegister = async (data: { name: string; type: string; opening_balance?: number }) => {
    if (!clinic?.id) return null;
    const { data: result, error } = await supabase
      .from('cash_registers')
      .insert({
        clinic_id: clinic.id,
        name: data.name,
        type: data.type,
        opening_balance: data.opening_balance || 0,
        current_balance: data.opening_balance || 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Ошибка создания кассы: ' + error.message);
      return null;
    }
    toast.success('Касса создана');
    await fetchRegisters();
    return result;
  };

  const updateRegister = async (id: string, data: Partial<CashRegister>) => {
    const { error } = await supabase
      .from('cash_registers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Ошибка обновления кассы: ' + error.message);
      return false;
    }
    toast.success('Касса обновлена');
    await fetchRegisters();
    return true;
  };

  const recordOperation = async (params: {
    cash_register_id: string;
    type: 'income' | 'expense' | 'transfer' | 'adjustment';
    amount: number;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
  }) => {
    if (!clinic?.id) return false;

    const register = registers.find(r => r.id === params.cash_register_id);
    if (!register) return false;

    const sign = params.type === 'income' ? 1 : params.type === 'expense' ? -1 :
                 params.type === 'adjustment' ? 1 : 0;
    const newBalance = register.current_balance + (params.amount * sign);

    const { error: opError } = await supabase
      .from('cash_register_operations')
      .insert({
        cash_register_id: params.cash_register_id,
        clinic_id: clinic.id,
        type: params.type,
        amount: params.amount,
        balance_after: newBalance,
        reference_type: params.reference_type,
        reference_id: params.reference_id,
        notes: params.notes,
      });

    if (opError) {
      toast.error('Ошибка записи операции: ' + opError.message);
      return false;
    }

    const { error: balError } = await supabase
      .from('cash_registers')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', params.cash_register_id);

    if (balError) {
      console.error('Error updating balance:', balError);
    }

    await Promise.all([fetchRegisters(), fetchOperations()]);
    return true;
  };

  const totalBalance = registers.filter(r => r.is_active).reduce((sum, r) => sum + Number(r.current_balance), 0);

  return {
    registers,
    operations,
    loading,
    totalBalance,
    createRegister,
    updateRegister,
    recordOperation,
    fetchRegisters,
    fetchOperations,
  };
}
