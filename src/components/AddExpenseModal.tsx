import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Users, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { supabase, Expense, ExpenseSplit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCategories, useBankAccounts, useSavedPersons } from '../hooks/useExpenses';
import CategoryIcon from './icons/CategoryIcon';

type SplitEntry = {
  id?: string;
  person_name: string;
  split_amount: string;
  amount_received: number;
  is_settled: boolean;
  manually_set: boolean;
};

type Props = {
  expense?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
};

function toDateTimeLocal(dateStr: string) {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(val: string) {
  return new Date(val).toISOString();
}

export default function AddExpenseModal({ expense, onClose, onSaved }: Props) {
  const { user, profile } = useAuth();
  const categories = useCategories();
  const { accounts } = useBankAccounts();
  const { persons, savePerson } = useSavedPersons();

  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [categoryId, setCategoryId] = useState(expense?.category_id || '');
  const [bankAccountId, setBankAccountId] = useState(expense?.bank_account_id || '');
  const [paymentDate, setPaymentDate] = useState(
    expense ? toDateTimeLocal(expense.payment_date) : toDateTimeLocal(new Date().toISOString())
  );
  const [notes, setNotes] = useState(expense?.notes || '');
  const [hasSplit, setHasSplit] = useState(expense?.has_split || false);
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [loading, setSaving] = useState(false);
  const [splitError, setSplitError] = useState('');
  const [personInput, setPersonInput] = useState('');
  const [showPersonSuggestions, setShowPersonSuggestions] = useState<number | null>(null);
  const personInputRef = useRef<HTMLInputElement[]>([]);

  const userName = profile?.display_name || 'Me';

  useEffect(() => {
    if (expense?.splits && expense.splits.length > 0) {
      setSplits(expense.splits.map(s => ({
        id: s.id,
        person_name: s.person_name,
        split_amount: String(s.split_amount),
        amount_received: s.amount_received,
        is_settled: s.is_settled,
        manually_set: true,
      })));
    } else if (!expense && hasSplit) {
      initializeSplits();
    }
  }, [expense]);

  const initializeSplits = () => {
    const amt = parseFloat(amount) || 0;
    setSplits([{
      person_name: userName,
      split_amount: amt > 0 ? (amt / 2).toFixed(2) : '0',
      amount_received: 0,
      is_settled: false,
      manually_set: false,
    }, {
      person_name: '',
      split_amount: amt > 0 ? (amt / 2).toFixed(2) : '0',
      amount_received: 0,
      is_settled: false,
      manually_set: false,
    }]);
  };

  const toggleSplit = () => {
    const newVal = !hasSplit;
    setHasSplit(newVal);
    setSplitError('');
    if (newVal && splits.length === 0) {
      initializeSplits();
    }
  };

  const redistributeAmounts = (updatedSplits: SplitEntry[], changedIdx: number) => {
    const total = parseFloat(amount) || 0;
    const manualSplits = updatedSplits.filter((s, i) => s.manually_set || i === changedIdx);
    const manualTotal = manualSplits.reduce((sum, s) => sum + (parseFloat(s.split_amount) || 0), 0);
    const autoSplits = updatedSplits.filter((s, i) => !s.manually_set && i !== changedIdx);

    if (autoSplits.length === 0) return updatedSplits;

    const remaining = Math.max(0, total - manualTotal);
    const perPerson = remaining / autoSplits.length;

    return updatedSplits.map((s, i) => {
      if (!s.manually_set && i !== changedIdx) {
        return { ...s, split_amount: perPerson.toFixed(2) };
      }
      return s;
    });
  };

  const updateSplitAmount = (idx: number, val: string) => {
    setSplitError('');
    const updated = splits.map((s, i) =>
      i === idx ? { ...s, split_amount: val, manually_set: true } : s
    );
    const redistributed = redistributeAmounts(updated, idx);
    setSplits(redistributed);
  };

  const updateSplitName = (idx: number, name: string) => {
    setSplits(prev => prev.map((s, i) => i === idx ? { ...s, person_name: name } : s));
  };

  const addSplitPerson = () => {
    const total = parseFloat(amount) || 0;
    const newCount = splits.length + 1;
    const autoSplits = splits.filter(s => !s.manually_set);

    if (autoSplits.length === 0) {
      setSplits(prev => [...prev, {
        person_name: '',
        split_amount: '0',
        amount_received: 0,
        is_settled: false,
        manually_set: false,
      }]);
      return;
    }

    const manualTotal = splits.filter(s => s.manually_set).reduce((sum, s) => sum + (parseFloat(s.split_amount) || 0), 0);
    const remaining = Math.max(0, total - manualTotal);
    const perAuto = remaining / (autoSplits.length + 1);

    setSplits(prev => [
      ...prev.map(s => !s.manually_set ? { ...s, split_amount: perAuto.toFixed(2) } : s),
      {
        person_name: '',
        split_amount: perAuto.toFixed(2),
        amount_received: 0,
        is_settled: false,
        manually_set: false,
      }
    ]);
  };

  const removeSplit = (idx: number) => {
    if (splits.length <= 2) return;
    const updated = splits.filter((_, i) => i !== idx);
    const total = parseFloat(amount) || 0;
    const manualTotal = updated.filter(s => s.manually_set).reduce((sum, s) => sum + (parseFloat(s.split_amount) || 0), 0);
    const autoSplits = updated.filter(s => !s.manually_set);
    if (autoSplits.length > 0) {
      const remaining = Math.max(0, total - manualTotal);
      const perAuto = remaining / autoSplits.length;
      setSplits(updated.map(s => !s.manually_set ? { ...s, split_amount: perAuto.toFixed(2) } : s));
    } else {
      setSplits(updated);
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (hasSplit && splits.length > 0) {
      const total = parseFloat(val) || 0;
      const autoSplits = splits.filter(s => !s.manually_set);
      if (autoSplits.length === 0) return;
      const manualTotal = splits.filter(s => s.manually_set).reduce((sum, s) => sum + (parseFloat(s.split_amount) || 0), 0);
      const remaining = Math.max(0, total - manualTotal);
      const perAuto = remaining / autoSplits.length;
      setSplits(prev => prev.map(s => !s.manually_set ? { ...s, split_amount: perAuto.toFixed(2) } : s));
    }
  };

  const handleSave = async () => {
    if (!user || !title.trim() || !amount) return;

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return;

    if (hasSplit && splits.length > 0) {
      const splitTotal = splits.reduce((sum, s) => sum + (parseFloat(s.split_amount) || 0), 0);
      if (Math.abs(splitTotal - totalAmount) > 0.01) {
        setSplitError(`Split amounts (₹${splitTotal.toFixed(2)}) don't match total (₹${totalAmount.toFixed(2)})`);
        return;
      }
      const emptyNames = splits.some(s => !s.person_name.trim());
      if (emptyNames) {
        setSplitError('All split persons must have a name');
        return;
      }
    }

    setSaving(true);
    setSplitError('');

    const expenseData = {
      user_id: user.id,
      title: title.trim(),
      amount: totalAmount,
      category_id: categoryId || null,
      bank_account_id: bankAccountId || null,
      payment_date: fromDateTimeLocal(paymentDate),
      notes: notes.trim(),
      has_split: hasSplit && splits.length > 0,
      updated_at: new Date().toISOString(),
    };

    let expenseId = expense?.id;

    if (expense) {
      await supabase.from('expenses').update(expenseData).eq('id', expense.id);
      if (hasSplit) {
        await supabase.from('expense_splits').delete().eq('expense_id', expense.id);
      }
    } else {
      const { data } = await supabase.from('expenses').insert(expenseData).select().single();
      expenseId = data?.id;
    }

    if (hasSplit && expenseId && splits.length > 0) {
      const splitRecords = splits.map(s => ({
        expense_id: expenseId,
        person_name: s.person_name.trim(),
        split_amount: parseFloat(s.split_amount) || 0,
        amount_received: s.amount_received || 0,
        is_settled: s.is_settled || false,
      }));
      await supabase.from('expense_splits').insert(splitRecords);

      for (const s of splits) {
        if (s.person_name.trim()) await savePerson(s.person_name.trim());
      }
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const filteredPersons = (query: string) =>
    persons.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  const splitTotal = splits.reduce((sum, s) => sum + (parseFloat(s.split_amount) || 0), 0);
  const totalAmount = parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 z-50 modal-overlay flex items-end justify-center">
      <div className="card-glass rounded-t-3xl w-full max-w-lg animate-slide-up overflow-hidden" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="sticky top-0 card-glass border-b border-white/40 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 pb-8">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title</label>
            <input
              type="text"
              placeholder="What did you spend on?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => handleAmountChange(e.target.value)}
                className="input-glass w-full pl-8 pr-4 py-3 text-sm font-semibold"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Payment Date & Time */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date & Time</label>
            <input
              type="datetime-local"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
                  className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${
                    categoryId === cat.id ? 'ring-2 ring-blue-500' : 'hover:bg-white/50'
                  }`}
                  style={{ backgroundColor: categoryId === cat.id ? cat.color + '22' : 'rgba(255,255,255,0.5)' }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center mb-1"
                    style={{ backgroundColor: cat.color + '33' }}
                  >
                    <CategoryIcon icon={cat.icon} size={15} />
                  </div>
                  <span className="text-xs text-gray-600 text-center leading-tight" style={{ fontSize: '10px' }}>
                    {cat.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bank Account */}
          {accounts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bank Account</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setBankAccountId('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    !bankAccountId ? 'bg-blue-500 text-white' : 'bg-white/60 text-gray-600 border border-gray-200'
                  }`}
                >
                  None
                </button>
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setBankAccountId(bankAccountId === acc.id ? '' : acc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      bankAccountId === acc.id ? 'text-white' : 'bg-white/60 text-gray-600 border border-gray-200'
                    }`}
                    style={{ backgroundColor: bankAccountId === acc.id ? acc.color : undefined }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: bankAccountId === acc.id ? 'white' : acc.color }}
                    />
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Notes (optional)</label>
            <textarea
              placeholder="Add a note..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Split Toggle */}
          <div className="card-glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Split Expense</p>
                  <p className="text-xs text-gray-400">Divide with others</p>
                </div>
              </div>
              <button
                onClick={toggleSplit}
                className={`w-12 h-7 rounded-full transition-all duration-200 ${hasSplit ? 'bg-blue-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${hasSplit ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {hasSplit && (
              <div className="mt-4 space-y-3">
                {/* Split total indicator */}
                <div className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 ${
                  Math.abs(splitTotal - totalAmount) < 0.01
                    ? 'bg-green-50 text-green-700'
                    : 'bg-orange-50 text-orange-700'
                }`}>
                  <span>Split total</span>
                  <span className="font-semibold">
                    ₹{splitTotal.toFixed(2)} / ₹{totalAmount.toFixed(2)}
                    {Math.abs(splitTotal - totalAmount) < 0.01
                      ? <Check size={12} className="inline ml-1" />
                      : ` (₹${Math.abs(totalAmount - splitTotal).toFixed(2)} remaining)`
                    }
                  </span>
                </div>

                {splits.map((split, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1 relative">
                      <input
                        ref={el => { if (el) personInputRef.current[idx] = el; }}
                        type="text"
                        placeholder={idx === 0 ? 'Your name' : 'Person name'}
                        value={split.person_name}
                        onChange={e => {
                          updateSplitName(idx, e.target.value);
                          setPersonInput(e.target.value);
                          setShowPersonSuggestions(idx);
                        }}
                        onFocus={() => setShowPersonSuggestions(idx)}
                        onBlur={() => setTimeout(() => setShowPersonSuggestions(null), 200)}
                        className="input-glass w-full px-3 py-2.5 text-sm"
                      />
                      {showPersonSuggestions === idx && filteredPersons(split.person_name).length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 card-glass rounded-xl mt-1 overflow-hidden">
                          {filteredPersons(split.person_name).slice(0, 5).map(p => (
                            <button
                              key={p.id}
                              onMouseDown={() => {
                                updateSplitName(idx, p.name);
                                setShowPersonSuggestions(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        value={split.split_amount}
                        onChange={e => updateSplitAmount(idx, e.target.value)}
                        className="input-glass w-full pl-6 pr-2 py-2.5 text-sm text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {splits.length > 2 && (
                      <button
                        onClick={() => removeSplit(idx)}
                        className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addSplitPerson}
                  className="flex items-center gap-2 text-blue-500 text-sm font-medium py-1"
                >
                  <Plus size={16} />
                  Add person
                </button>

                {splitError && (
                  <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{splitError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={loading || !title.trim() || !amount}
            className="btn-primary w-full py-4 text-base disabled:opacity-50"
          >
            {loading ? 'Saving...' : expense ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
