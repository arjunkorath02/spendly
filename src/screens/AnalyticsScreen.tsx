import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Brain } from 'lucide-react';
import { supabase, Expense, Category } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../hooks/useExpenses';
import CategoryIcon from '../components/icons/CategoryIcon';

function getMonths(count: number) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function formatMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

type MonthData = {
  month: string;
  total: number;
  byCategory: Record<string, number>;
};

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const categories = useCategories();
  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const months = getMonths(6);
    const fetchData = async () => {
      setLoading(true);
      const results: MonthData[] = [];

      for (const month of months) {
        const [y, m] = month.split('-').map(Number);
        const start = new Date(y, m - 1, 1).toISOString();
        const end = new Date(y, m, 0, 23, 59, 59).toISOString();

        const { data } = await supabase
          .from('expenses')
          .select('amount, category_id, splits:expense_splits(amount_received)')
          .eq('user_id', user.id)
          .gte('payment_date', start)
          .lte('payment_date', end);

        const expenses = (data || []) as Array<{ amount: number; category_id: string | null; splits: Array<{ amount_received: number }> }>;
        const byCategory: Record<string, number> = {};
        let total = 0;

        for (const e of expenses) {
          const received = e.splits?.reduce((s, sp) => s + sp.amount_received, 0) ?? 0;
          const net = e.amount - received;
          total += net;
          const cid = e.category_id || 'other';
          byCategory[cid] = (byCategory[cid] || 0) + net;
        }

        results.push({ month, total, byCategory });
      }

      setMonthData(results);

      // Predict next month using weighted average (recent months weighted more)
      if (results.length >= 2) {
        const weights = [1, 1.5, 2, 2.5, 3, 3.5];
        const relevantData = results.filter(r => r.total > 0);
        if (relevantData.length > 0) {
          let weightedSum = 0;
          let totalWeight = 0;
          relevantData.forEach((r, i) => {
            const w = weights[results.length - relevantData.length + i] || 1;
            weightedSum += r.total * w;
            totalWeight += w;
          });
          setPrediction(weightedSum / totalWeight);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const maxMonthTotal = Math.max(...monthData.map(m => m.total), 1);
  const currentMonth = monthData[monthData.length - 1];
  const lastMonth = monthData[monthData.length - 2];
  const trend = currentMonth && lastMonth && lastMonth.total > 0
    ? ((currentMonth.total - lastMonth.total) / lastMonth.total) * 100
    : null;

  const topCategories = categories
    .map(cat => ({
      ...cat,
      total: monthData.reduce((sum, m) => sum + (m.byCategory[cat.id] || 0), 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const grandTotal = monthData.reduce((s, m) => s + m.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics</h1>
        <p className="text-sm text-gray-500">Last 6 months overview</p>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-glass rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">This Month</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{(currentMonth?.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            {trend !== null && (
              <div className={`flex items-center gap-1 mt-1 ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="text-xs font-medium">{Math.abs(trend).toFixed(1)}% vs last month</span>
              </div>
            )}
          </div>
          <div className="card-glass rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">6-Month Total</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Avg: ₹{(grandTotal / 6).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
            </p>
          </div>
        </div>

        {/* AI Prediction */}
        {prediction !== null && prediction > 0 && (
          <div className="rounded-3xl p-5 text-white overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #007AFF, transparent)', transform: 'translate(40%, -40%)' }} />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Brain size={20} className="text-blue-300" />
              </div>
              <div>
                <p className="text-blue-200 text-xs font-medium mb-0.5">AI Prediction</p>
                <p className="text-2xl font-bold mb-1">
                  ₹{prediction.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-white/60 text-xs">Expected spend next month based on your patterns</p>
              </div>
            </div>
          </div>
        )}

        {/* Bar chart */}
        <div className="card-glass rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-500" />
            <h2 className="text-base font-bold text-gray-900">Monthly Spending</h2>
          </div>
          <div className="flex items-end gap-2 h-36">
            {monthData.map((m, i) => {
              const height = maxMonthTotal > 0 ? (m.total / maxMonthTotal) * 100 : 0;
              const isCurrentMonth = i === monthData.length - 1;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: '112px' }}>
                    <div
                      className="w-full rounded-t-xl transition-all duration-700"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        background: isCurrentMonth
                          ? 'linear-gradient(to top, #007AFF, #60A5FA)'
                          : 'linear-gradient(to top, #e5e7eb, #f3f4f6)',
                        minHeight: '4px',
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{formatMonth(m.month)}</span>
                </div>
              );
            })}
          </div>
          {/* Value labels */}
          <div className="flex gap-2 mt-1">
            {monthData.map((m, i) => (
              <div key={m.month} className="flex-1 text-center">
                <span className="text-xs font-medium" style={{ color: i === monthData.length - 1 ? '#007AFF' : '#9CA3AF' }}>
                  {m.total > 0 ? `₹${(m.total / 1000).toFixed(0)}k` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        {topCategories.length > 0 && (
          <div className="card-glass rounded-3xl p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Top Categories</h2>
            <div className="space-y-3">
              {topCategories.map(cat => {
                const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '22' }}>
                          <CategoryIcon icon={cat.icon} size={14} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          ₹{cat.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
