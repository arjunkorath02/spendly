import { useState } from 'react';
import { Plus, Filter, X, TrendingDown, TrendingUp } from 'lucide-react';
import { useExpenses, DateFilter } from '../hooks/useExpenses';
import { useCategories, useBankAccounts } from '../hooks/useExpenses';
import DateFilterBar from '../components/DateFilterBar';
import ExpenseCard from '../components/ExpenseCard';
import AddExpenseModal from '../components/AddExpenseModal';
import { Expense } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [dateFilter, setDateFilter] = useState<DateFilter>({ mode: 'month', month: getCurrentMonth() });
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const { expenses, loading, refresh } = useExpenses(dateFilter, filterCategoryId || undefined, filterBankId || undefined, activeTab);
  const categories = useCategories();
  const { accounts } = useBankAccounts();

  const totalAmount = expenses.reduce((sum, e) => {
    const received = e.splits?.reduce((s, sp) => s + sp.amount_received, 0) ?? 0;
    return sum + (e.amount - received);
  }, 0);

  const byCategory = categories
    .map(cat => ({
      ...cat,
      total: expenses
        .filter(e => e.category_id === cat.id)
        .reduce((sum, e) => {
          const received = e.splits?.reduce((s, sp) => s + sp.amount_received, 0) ?? 0;
          return sum + (e.amount - received);
        }, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grouped: Record<string, Expense[]> = {};
  expenses.forEach(e => {
    const date = new Date(e.payment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Hello, {profile?.display_name?.split(' ')[0] || 'there'}</p>
            <h1 className="text-2xl font-bold text-gray-900">{activeTab === 'expense' ? 'Expenses' : 'Income'}</h1>
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              showFilters || filterCategoryId || filterBankId
                ? 'bg-blue-500 text-white'
                : 'card-glass text-gray-600'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setActiveTab('expense'); setFilterCategoryId(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'expense'
                ? 'card-glass bg-blue-500 text-white shadow-lg'
                : 'card-glass text-gray-600'
            }`}
          >
            <TrendingDown size={14} />
            Expenses
          </button>
          <button
            onClick={() => { setActiveTab('income'); setFilterCategoryId(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'income'
                ? 'card-glass bg-green-500 text-white shadow-lg'
                : 'card-glass text-gray-600'
            }`}
          >
            <TrendingUp size={14} />
            Income
          </button>
        </div>

        <DateFilterBar filter={dateFilter} onChange={setDateFilter} />

        {/* Filters dropdown */}
        {showFilters && (
          <div className="mt-3 card-glass rounded-2xl p-4 space-y-3 animate-fade-in">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Category</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterCategoryId('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${!filterCategoryId ? 'bg-blue-500 text-white' : 'card-glass text-gray-600'}`}
                >
                  All
                </button>
                {categories.filter(c => !c.user_id || (activeTab === 'income' && c.name === 'Income') || (activeTab === 'expense')).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? '' : cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterCategoryId === cat.id ? 'text-white' : 'card-glass text-gray-600'}`}
                    style={{ backgroundColor: filterCategoryId === cat.id ? cat.color : undefined }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            {accounts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Bank Account</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterBankId('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${!filterBankId ? 'bg-blue-500 text-white' : 'card-glass text-gray-600'}`}
                  >
                    All
                  </button>
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => setFilterBankId(filterBankId === acc.id ? '' : acc.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${filterBankId === acc.id ? 'text-white' : 'card-glass text-gray-600'}`}
                      style={{ backgroundColor: filterBankId === acc.id ? acc.color : undefined }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: filterBankId === acc.id ? 'white' : acc.color }} />
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="px-4 mb-4">
        <div className="card-glass rounded-3xl p-5 text-white overflow-hidden relative" style={{
          background: activeTab === 'income'
            ? 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)'
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #007AFF, transparent)', transform: 'translate(30%, -30%)' }} />
          <p className="text-white/60 text-sm font-medium mb-1">{activeTab === 'expense' ? 'Total Spent' : 'Total Income'}</p>
          <p className="text-3xl font-bold mb-3">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {byCategory.slice(0, 3).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {byCategory.slice(0, 3).map(cat => (
                <div key={cat.id} className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-white/80">{cat.name.split(' ')[0]}: ₹{cat.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense/Income list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 card-glass rounded-3xl flex items-center justify-center mb-3">
              {activeTab === 'expense' ? (
                <TrendingDown size={28} className="text-gray-400" />
              ) : (
                <TrendingUp size={28} className="text-gray-400" />
              )}
            </div>
            <p className="text-gray-600 font-medium">No {activeTab === 'expense' ? 'expenses' : 'income'}</p>
            <p className="text-gray-400 text-sm mt-1">Tap + to add your first {activeTab === 'expense' ? 'expense' : 'income'}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayItems]) => (
            <div key={date} className="mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{date}</p>
                <p className="text-xs font-semibold text-gray-500">
                  ₹{dayItems.reduce((s, e) => {
                    const r = e.splits?.reduce((a, sp) => a + sp.amount_received, 0) ?? 0;
                    return s + (e.amount - r);
                  }, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="space-y-2">
                {dayItems.map(e => (
                  <ExpenseCard key={e.id} expense={e} onClick={() => setEditExpense(e)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB - Centered at bottom */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary w-16 h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform duration-200"
        >
          <Plus size={28} />
        </button>
      </div>

      {(showAdd || editExpense) && (
        <AddExpenseModal
          expense={editExpense}
          onClose={() => {
            setShowAdd(false);
            setEditExpense(null);
          }}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}
