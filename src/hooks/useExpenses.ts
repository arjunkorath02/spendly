import { useState, useEffect, useCallback } from 'react';
import { supabase, Expense, Category, BankAccount, SavedPerson } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type DateFilter = {
  mode: 'month' | 'range' | 'all';
  month?: string; // YYYY-MM
  from?: string;  // YYYY-MM-DD
  to?: string;    // YYYY-MM-DD
};

export function useExpenses(dateFilter: DateFilter, categoryId?: string, bankAccountId?: string) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('expenses')
      .select(`*, category:categories(*), bank_account:bank_accounts(*), splits:expense_splits(*)`)
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false });

    if (dateFilter.mode === 'month' && dateFilter.month) {
      const start = `${dateFilter.month}-01`;
      const end = new Date(parseInt(dateFilter.month.split('-')[0]), parseInt(dateFilter.month.split('-')[1]), 0)
        .toISOString().split('T')[0];
      query = query.gte('payment_date', start).lte('payment_date', end + 'T23:59:59');
    } else if (dateFilter.mode === 'range' && dateFilter.from && dateFilter.to) {
      query = query.gte('payment_date', dateFilter.from).lte('payment_date', dateFilter.to + 'T23:59:59');
    }

    if (categoryId) query = query.eq('category_id', categoryId);
    if (bankAccountId) query = query.eq('bank_account_id', bankAccountId);

    const { data } = await query;
    setExpenses((data as Expense[]) || []);
    setLoading(false);
  }, [user, dateFilter, categoryId, bankAccountId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { expenses, loading, refresh: fetch };
}

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('categories')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${user.id}`)
      .order('name')
      .then(({ data }) => setCategories(data || []));
  }, [user]);

  return categories;
}

export function useBankAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at');
    setAccounts(data || []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { accounts, refresh: fetch };
}

export function useSavedPersons() {
  const { user } = useAuth();
  const [persons, setPersons] = useState<SavedPerson[]>([]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_persons')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setPersons(data || []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const savePerson = async (name: string) => {
    if (!user || !name.trim()) return;
    await supabase
      .from('saved_persons')
      .upsert({ user_id: user.id, name: name.trim() }, { onConflict: 'user_id,name' });
    await fetch();
  };

  return { persons, savePerson, refresh: fetch };
}
