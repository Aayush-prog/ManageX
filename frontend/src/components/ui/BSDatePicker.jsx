import { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-date-converter';
import { BS_MONTHS } from '../../utils/nepaliDate.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const getDaysInBSMonth = (bsYear, bsMonth) => {
  const start = new NepaliDate(bsYear, bsMonth, 1).toJsDate();
  let nextYear = bsYear, nextMonth = bsMonth + 1;
  if (nextMonth === 12) { nextMonth = 0; nextYear++; }
  const nextStart = new NepaliDate(nextYear, nextMonth, 1).toJsDate();
  return Math.round((nextStart - start) / 86_400_000);
};

const todayBS = () => {
  try {
    const nd = new NepaliDate(new Date());
    return { year: nd.getYear(), month: nd.getMonth(), day: nd.getDate() };
  } catch { return { year: 2082, month: 0, day: 1 }; }
};

const BSDatePicker = ({ value, onChange, placeholder = 'Select date', className = '' }) => {
  const today = todayBS();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);
  const ref = useRef(null);

  useEffect(() => {
    if (value) {
      try {
        const nd = new NepaliDate(new Date(value + 'T00:00:00'));
        setViewYear(nd.getYear());
        setViewMonth(nd.getMonth());
      } catch {}
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedBS = value ? (() => {
    try {
      const nd = new NepaliDate(new Date(value + 'T00:00:00'));
      return { year: nd.getYear(), month: nd.getMonth(), day: nd.getDate() };
    } catch { return null; }
  })() : null;

  const daysInMonth = getDaysInBSMonth(viewYear, viewMonth);
  const firstDayOfWeek = new NepaliDate(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day) => {
    const d = new NepaliDate(viewYear, viewMonth, day).toJsDate();
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    onChange(iso);
    setOpen(false);
  };

  const displayValue = selectedBS
    ? `${BS_MONTHS[selectedBS.month]} ${selectedBS.day}, ${selectedBS.year}`
    : '';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        {displayValue || <span className="text-gray-400">{placeholder}</span>}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[272px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 text-lg leading-none">‹</button>
            <span className="text-sm font-semibold text-gray-800">
              {BS_MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 text-lg leading-none">›</button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday    = viewYear === today.year && viewMonth === today.month && day === today.day;
              const isSelected = selectedBS && viewYear === selectedBS.year && viewMonth === selectedBS.month && day === selectedBS.day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`text-center text-sm py-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white font-semibold'
                      : isToday
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BSDatePicker;
