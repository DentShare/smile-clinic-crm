import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { Expense, ExpenseCategory } from '@/types/database';
import { toast } from 'sonner';

export function useExpenses() {
  const { clinic } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching expense categories:', error);
      return;
    }
    setCategories(data || []);
  }, [clinic?.id]);

  const fetchExpenses = useCallback(async (dateFrom?: string, dateTo?: string) => {
    if (!clinic?.id) return;
    let query = supabase
      .from('expenses')
      .select('*, category:expense_categories(id, name)')
      .eq('clinic_id', clinic.id)
      .order('date', { ascending: false })
      .limit(200);

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }
    setExpenses(data || []);
  }, [clinic?.id]);

  useEffect(() => {
    if (clinic?.id) {
      setLoading(true);
      Promise.all([fetchCategories(), fetchExpenses()]).finally(() => setLoading(false));
    }
  }, [clinic?.id, fetchCategories, fetchExpenses]);

  const createCategory = async (name: string, parentId?: string) => {
    if (!clinic?.id) return null;
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ clinic_id: clinic.id, name, parent_id: parentId || null })
      .select()
      .single();

    if (error) {
      toast.error('Ошибка создания категории: ' + error.message);
      return null;
    }
    toast.success('Категория создана');
    await fetchCategories();
    return data;
  };

  const updateCategory = async (id: string, name: string) => {
    const { error } = await supabase
      .from('expense_categories')
      .update({ name })
      .eq('id', id);

    if (error) {
      toast.error('Ошибка обновления категории: ' + error.message);
      return false;
    }
    await fetchCategories();
    return true;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('expense_categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast.error('Ошибка удаления категории: ' + error.message);
      return false;
    }
    toast.success('Категория удалена');
    await fetchCategories();
    return true;
  };

  const createExpense = async (data: {
    category_id?: string;
    cash_register_id?: string;
    amount: number;
    description?: string;
    date?: string;
  }) => {
    if (!clinic?.id) return null;
    const { data: result, error } = await supabase
      .from('expenses')
      .insert({
        clinic_id: clinic.id,
        category_id: data.category_id || null,
        cash_register_id: data.cash_register_id || null,
        amount: data.amount,
        description: data.description || null,
        date: data.date || new Date().toISOString().split('T')[0],
      })
      .select('*, category:expense_categories(id, name)')
      .single();

    if (error) {
      toast.error('Ошибка создания расхода: ' + error.message);
      return null;
    }
    toast.success('Расход добавлен');
    await fetchExpenses();
    return result;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Ошибка удаления расхода: ' + error.message);
      return false;
    }
    toast.success('Расход удалён');
    await fetchExpenses();
    return true;
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    expenses,
    categories,
    loading,
    totalExpenses,
    fetchExpenses,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createExpense,
    deleteExpense,
  };
}
