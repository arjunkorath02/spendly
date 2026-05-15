import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

export type BankAccount = {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  account_type: string;
  color: string;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
};

export type SavedPerson = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  person_name: string;
  split_amount: number;
  amount_received: number;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category_id: string | null;
  bank_account_id: string | null;
  payment_date: string;
  notes: string;
  has_split: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  bank_account?: BankAccount;
  splits?: ExpenseSplit[];
};
