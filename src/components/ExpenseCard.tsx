import { Expense } from '../lib/supabase';
import CategoryIcon from './icons/CategoryIcon';
import { Users, Building2 } from 'lucide-react';

type Props = {
  expense: Expense;
  onClick: () => void;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ExpenseCard({ expense, onClick }: Props) {
  const totalReceived = expense.splits?.reduce((s, sp) => s + sp.amount_received, 0) ?? 0;
  const totalSplit = expense.splits?.reduce((s, sp) => s + sp.split_amount, 0) ?? 0;
  const netAmount = expense.amount - totalReceived;

  return (
    <div className="expense-card card-glass rounded-2xl p-4" onClick={onClick}>
      <div className="flex items-center gap-3">
        {/* Category icon */}
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: (expense.category?.color || '#6B7280') + '22' }}
        >
          <CategoryIcon
            icon={expense.category?.icon || 'circle'}
            size={20}
            color={expense.category?.color || '#6B7280'}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 truncate pr-2">{expense.title}</p>
            <p className="text-sm font-bold text-gray-900 flex-shrink-0">
              ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">{formatDate(expense.payment_date)}</p>
              {expense.bank_account && (
                <div className="flex items-center gap-1">
                  <Building2 size={10} className="text-gray-400" />
                  <span className="text-xs text-gray-400 truncate max-w-20">{expense.bank_account.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {expense.has_split && expense.splits && expense.splits.length > 0 && (
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Users size={10} className="text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">
                    {totalSplit > 0
                      ? `₹${(totalSplit - totalReceived).toLocaleString('en-IN', { maximumFractionDigits: 0 })} due`
                      : 'Split'}
                  </span>
                </div>
              )}
              {expense.amount !== netAmount && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
