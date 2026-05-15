import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Calendar, DollarSign, User, X } from 'lucide-react';
import { supabase, ExpenseSplit, Expense } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PersonSummary = {
  name: string;
  total_owed: number;
  total_received: number;
  pending: number;
  splits: Array<ExpenseSplit & { expense: Expense }>;
};

type SettleModalData = {
  split: ExpenseSplit & { expense: Expense };
  personName: string;
} | null;

export default function ReceivablesScreen() {
  const { user } = useAuth();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [settleModal, setSettleModal] = useState<SettleModalData>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('expense_splits')
      .select(`*, expense:expenses(*, category:categories(*), bank_account:bank_accounts(*))`)
      .eq('expense.user_id', user.id)
      .order('created_at', { ascending: false });

    const splits = (data || []).filter(s => s.expense) as Array<ExpenseSplit & { expense: Expense }>;

    // Group by person
    const byPerson: Record<string, PersonSummary> = {};
    for (const split of splits) {
      const name = split.person_name;
      if (!byPerson[name]) {
        byPerson[name] = { name, total_owed: 0, total_received: 0, pending: 0, splits: [] };
      }
      byPerson[name].total_owed += split.split_amount;
      byPerson[name].total_received += split.amount_received;
      byPerson[name].pending += split.split_amount - split.amount_received;
      byPerson[name].splits.push(split);
    }

    // Filter out the current user's own name and fully settled persons
    const profile = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    const userName = profile.data?.display_name || '';

    const result = Object.values(byPerson)
      .filter(p => p.name !== userName && p.pending > 0.01)
      .sort((a, b) => b.pending - a.pending);

    setPersons(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openSettle = (split: ExpenseSplit & { expense: Expense }, personName: string) => {
    const remaining = split.split_amount - split.amount_received;
    setSettleAmount(remaining.toFixed(2));
    setSettleModal({ split, personName });
  };

  const handleSettle = async () => {
    if (!settleModal) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSettling(true);
    const { split } = settleModal;
    const newReceived = split.amount_received + amount;
    const isSettled = newReceived >= split.split_amount - 0.01;

    await supabase
      .from('expense_splits')
      .update({
        amount_received: Math.min(newReceived, split.split_amount),
        is_settled: isSettled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', split.id);

    setSettling(false);
    setSettleModal(null);
    setSettleAmount('');
    await fetchData();
  };

  const totalPending = persons.reduce((s, p) => s + p.pending, 0);

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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Receivables</h1>
        <p className="text-sm text-gray-500">Money owed to you from splits</p>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Total pending card */}
        {totalPending > 0 && (
          <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #134e4a 0%, #065f46 100%)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #10B981, transparent)', transform: 'translate(40%, -40%)' }} />
            <p className="text-emerald-200 text-sm font-medium mb-1">Total Receivable</p>
            <p className="text-3xl font-bold">₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-emerald-300/70 text-xs mt-1">{persons.length} person{persons.length !== 1 ? 's' : ''} owe you</p>
          </div>
        )}

        {persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <p className="text-gray-600 font-medium">All settled up!</p>
            <p className="text-gray-400 text-sm mt-1">No pending receivables</p>
          </div>
        ) : (
          persons.map(person => (
            <div key={person.name} className="card-glass rounded-3xl overflow-hidden">
              {/* Person header */}
              <button
                onClick={() => setExpandedPerson(expandedPerson === person.name ? null : person.name)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <User size={20} className="text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{person.name}</p>
                    <p className="text-xs text-gray-400">{person.splits.length} transaction{person.splits.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">
                      ₹{person.pending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">pending</p>
                  </div>
                  {expandedPerson === person.name ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded splits */}
              {expandedPerson === person.name && (
                <div className="border-t border-gray-100">
                  {person.splits.map(split => {
                    const remaining = split.split_amount - split.amount_received;
                    if (remaining <= 0.01) return null;
                    return (
                      <div key={split.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{split.expense.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Calendar size={11} className="text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {new Date(split.expense.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            {split.amount_received > 0 && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full">
                                  <div
                                    className="h-full bg-emerald-400 rounded-full"
                                    style={{ width: `${(split.amount_received / split.split_amount) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">
                                  ₹{split.amount_received.toFixed(0)} received
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">₹{remaining.toFixed(2)}</p>
                              <p className="text-xs text-gray-400">of ₹{split.split_amount.toFixed(2)}</p>
                            </div>
                            <button
                              onClick={() => openSettle(split, person.name)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold"
                            >
                              Settle
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick settle all */}
                  {person.pending > 0.01 && (
                    <div className="p-4 bg-emerald-50/50">
                      <button
                        onClick={async () => {
                          for (const split of person.splits) {
                            const remaining = split.split_amount - split.amount_received;
                            if (remaining > 0.01) {
                              await supabase
                                .from('expense_splits')
                                .update({
                                  amount_received: split.split_amount,
                                  is_settled: true,
                                  updated_at: new Date().toISOString(),
                                })
                                .eq('id', split.id);
                            }
                          }
                          await fetchData();
                        }}
                        className="w-full py-2.5 bg-emerald-500 text-white rounded-2xl text-sm font-semibold"
                      >
                        Mark All Settled (₹{person.pending.toFixed(2)})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Settle modal */}
      {settleModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-end justify-center p-4">
          <div className="card-glass rounded-3xl p-5 w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setSettleModal(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-gray-600" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 mb-4">
              <p className="text-xs text-gray-500">{settleModal.personName} for</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{settleModal.split.expense.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(settleModal.split.expense.payment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount received</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  className="input-glass w-full pl-8 pr-4 py-3 text-sm font-semibold"
                  step="0.01"
                  min="0"
                  max={settleModal.split.split_amount - settleModal.split.amount_received}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSettleModal(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                disabled={settling}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {settling ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
