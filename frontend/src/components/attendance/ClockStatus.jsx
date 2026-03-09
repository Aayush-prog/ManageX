import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { fmtTime } from '../../utils/nepaliDate.js';

const fmt = fmtTime;

const hoursNow = (clockIn) =>
  parseFloat(((Date.now() - new Date(clockIn)) / 3_600_000).toFixed(2));

const ClockStatus = () => {
  const [record,      setRecord]      = useState(undefined); // undefined = loading
  const [elapsed,     setElapsed]     = useState(null);
  const [error,       setError]       = useState(null);
  const [clockingOut, setClockinOut]  = useState(false);

  useEffect(() => {
    api.get('/attendance/me/today')
      .then(({ data }) => {
        setRecord(data.data);
        if (data.data?.clockIn && !data.data?.clockOut) {
          setElapsed(hoursNow(data.data.clockIn));
        }
      })
      .catch(() => setError('Could not load attendance'));
  }, []);

  // Live elapsed time ticker (only while clocked in)
  useEffect(() => {
    if (!record?.clockIn || record?.clockOut) return;
    const id = setInterval(() => setElapsed(hoursNow(record.clockIn)), 60_000);
    return () => clearInterval(id);
  }, [record]);

  const handleClockOut = async () => {
    setClockinOut(true);
    try {
      const { data } = await api.post('/attendance/clock-out');
      setRecord(data.data);
    } catch { /* ignore */ } finally {
      setClockinOut(false);
    }
  };

  if (record === undefined) {
    return (
      <div className="card flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        <span className="text-sm text-gray-400">Loading attendance…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-100">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const isClockedIn  = Boolean(record?.clockIn && !record?.clockOut);
  const isClockedOut = Boolean(record?.clockOut);

  return (
    <div className="card flex flex-wrap items-center gap-6">
      {/* Status dot + label */}
      <div className="flex items-center gap-2.5">
        <span
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm font-semibold text-gray-800">
          {isClockedIn  ? 'Clocked In'  :
           isClockedOut ? 'Clocked Out' :
                          'Not clocked in today'}
        </span>
      </div>

      {record && (
        <>
          {/* Clock-in time */}
          <div className="text-sm text-gray-500">
            In: <span className="font-medium text-gray-700">{fmt(record.clockIn)}</span>
          </div>

          {/* Clock-out time */}
          {record.clockOut && (
            <div className="text-sm text-gray-500">
              Out: <span className="font-medium text-gray-700">{fmt(record.clockOut)}</span>
            </div>
          )}

          {/* Elapsed / total hours */}
          <div className="text-sm text-gray-500">
            {isClockedIn ? (
              <>Elapsed: <span className="font-medium text-gray-700">{elapsed}h</span></>
            ) : (
              <>Total: <span className="font-medium text-gray-700">{record.totalHours ?? '—'}h</span></>
            )}
          </div>

          {/* Late badge */}
          {record.isLate && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
              Late
            </span>
          )}
        </>
      )}

      {/* Manual clock-out button */}
      {isClockedIn && (
        <button
          onClick={handleClockOut}
          disabled={clockingOut}
          className="ml-auto text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors disabled:opacity-50"
        >
          {clockingOut ? 'Clocking out…' : 'Clock Out'}
        </button>
      )}
    </div>
  );
};

export default ClockStatus;
