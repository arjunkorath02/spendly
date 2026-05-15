import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DateFilter } from '../hooks/useExpenses';

type Props = {
  filter: DateFilter;
  onChange: (f: DateFilter) => void;
};

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function DateFilterBar({ filter, onChange }: Props) {
  const [showRange, setShowRange] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const currentMonth = getCurrentMonth();

  const prevMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const nextMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const activeMonth = filter.mode === 'month' ? filter.month || currentMonth : currentMonth;

  const applyRange = () => {
    if (rangeFrom && rangeTo) {
      onChange({ mode: 'range', from: rangeFrom, to: rangeTo });
      setShowRange(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Mode buttons */}
      <div className="flex gap-2">
        <div className="segment-control flex flex-1">
          <button
            onClick={() => onChange({ mode: 'month', month: currentMonth })}
            className={`flex-1 py-1.5 text-xs font-medium transition-all ${filter.mode === 'month' ? 'segment-active text-gray-900' : 'text-gray-500'}`}
          >
            Month
          </button>
          <button
            onClick={() => { setShowRange(true); }}
            className={`flex-1 py-1.5 text-xs font-medium transition-all ${filter.mode === 'range' ? 'segment-active text-gray-900' : 'text-gray-500'}`}
          >
            Date Range
          </button>
          <button
            onClick={() => onChange({ mode: 'all' })}
            className={`flex-1 py-1.5 text-xs font-medium transition-all ${filter.mode === 'all' ? 'segment-active text-gray-900' : 'text-gray-500'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Month navigator */}
      {filter.mode === 'month' && (
        <div className="card-glass rounded-2xl flex items-center justify-between px-4 py-2.5">
          <button
            onClick={() => onChange({ mode: 'month', month: prevMonth(activeMonth) })}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800">{formatMonth(activeMonth)}</span>
          <button
            onClick={() => {
              const next = nextMonth(activeMonth);
              if (next <= currentMonth) onChange({ mode: 'month', month: next });
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition ${nextMonth(activeMonth) > currentMonth ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      )}

      {/* Range display */}
      {filter.mode === 'range' && filter.from && filter.to && (
        <div className="card-glass rounded-2xl flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar size={14} className="text-blue-500" />
            <span>{filter.from} to {filter.to}</span>
          </div>
          <button onClick={() => onChange({ mode: 'month', month: currentMonth })} className="text-gray-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Range picker modal */}
      {showRange && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-end justify-center p-4">
          <div className="card-glass rounded-3xl p-5 w-full max-w-sm animate-slide-up">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Select Date Range</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={e => setRangeFrom(e.target.value)}
                  className="input-glass w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={e => setRangeTo(e.target.value)}
                  className="input-glass w-full px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRange(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={applyRange}
                className="flex-1 py-3 btn-primary text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
