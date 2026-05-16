/*
  # Add transaction type and bank opening balance

  1. Changes
    - Add `type` column to expenses table (income/expense)
    - Add `bank_accounts.opening_balance` to track initial balance
    - Add `bank_accounts.current_balance` for tracking (calculated field reference)

  2. Security
    - RLS policies already exist, no changes needed
*/

DO $$
BEGIN
  -- Add type column to expenses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'type'
  ) THEN
    ALTER TABLE expenses ADD COLUMN type text DEFAULT 'expense' CHECK (type IN ('expense', 'income'));
  END IF;

  -- Add opening_balance to bank_accounts if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_accounts' AND column_name = 'opening_balance'
  ) THEN
    ALTER TABLE bank_accounts ADD COLUMN opening_balance numeric(12,2) DEFAULT 0;
  END IF;
END $$;
