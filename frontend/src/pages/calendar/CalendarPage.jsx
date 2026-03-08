import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import BSDatePicker from '../../components/ui/BSDatePicker.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import NepaliDate from 'nepali-date-converter';
import { BS_MONTHS, bsMonthToADRange, currentBSMonthYear } from '../../utils/nepaliDate.js';

const bsISOtoADISO = (bsDateStr) => {
  const [y, m, d] = bsDateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  try {
    const adDate = new NepaliDate(y, m - 1, d).toJsDate();
    return `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`;
  } catch { return null; }
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_STYLES = {
  road:    { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700',    label: 'Road' },
  trail:   { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700',  label: 'Trail' },
  event:   { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: 'Event' },
  holiday: { dot: 'bg-red-400',    badge: 'bg-red-100 text-red-600',      label: 'Holiday' },
};

const CONTACT_STATUS_STYLES = {
  pending:   { badge: 'bg-yellow-100 text-yellow-700', label: 'Not Contacted' },
  contacted: { badge: 'bg-blue-100 text-blue-700',     label: 'Contacted' },
  rejected:  { badge: 'bg-red-100 text-red-700',       label: 'Rejected' },
  allowed:   { badge: 'bg-green-100 text-green-700',   label: 'Allowed' },
};

const localISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getDaysInBSMonth = (bsYear, bsMonth) => {
  const { startISO, endISO } = bsMonthToADRange(bsYear, bsMonth);
  const diff = Math.round((new Date(endISO + 'T00:00:00') - new Date(startISO + 'T00:00:00')) / 86400000);
  return diff + 1;
};

const getBSDay1Weekday = (bsYear, bsMonth) =>
  new NepaliDate(bsYear, bsMonth, 1).toJsDate().getDay();

const CalendarPage = () => {
  const { user } = useAuth();
  const canManage = ['manager', 'admin'].includes(user?.permissionLevel);
  const canUpdateStatus = ['finance', 'manager', 'admin'].includes(user?.permissionLevel);

  const today = new NepaliDate(new Date());
  const todayBSYear  = today.getYear();
  const todayBSMonth = today.getMonth();
  const todayBSDay   = today.getDate();

  const [bsYear,  setBsYear]  = useState(todayBSYear);
  const [bsMonth, setBsMonth] = useState(todayBSMonth);
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showAdd,   setShowAdd]   = useState(false);
  const [addDate,   setAddDate]   = useState('');
  const [addForm,   setAddForm]   = useState({ title: '', description: '', type: 'event', organizerContactName: '', organizerContactPosition: '', organizerPhone: '' });
  const [addError,  setAddError]  = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Bulk upload state
  const [showBulk,   setShowBulk]   = useState(false);
  const [bulkFile,   setBulkFile]   = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Selected day events popover
  const [selectedDay, setSelectedDay] = useState(null);

  // Contact status update
  const [statusUpdating, setStatusUpdating] = useState(null); // eventId being updated

  const loadEvents = async () => {
    setLoading(true);
    const { startISO, endISO } = bsMonthToADRange(bsYear, bsMonth);
    try {
      const { data } = await api.get(`/calendar?start=${startISO}&end=${endISO}`);
      setEvents(data.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [bsYear, bsMonth]);

  const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);
  const startWeekday = getBSDay1Weekday(bsYear, bsMonth);

  // Map BS day -> array of events for that day
  const eventsByBSDay = {};
  // Map BS day -> boolean (is declared holiday)
  const holidaysByBSDay = {};

  for (const ev of events) {
    const nd = new NepaliDate(new Date(ev.date));
    if (nd.getYear() === bsYear && nd.getMonth() === bsMonth) {
      const day = nd.getDate();
      if (!eventsByBSDay[day]) eventsByBSDay[day] = [];
      eventsByBSDay[day].push(ev);
      if (ev.type === 'holiday') holidaysByBSDay[day] = true;
    }
  }

  const prevMonth = () => {
    if (bsMonth === 0) { setBsYear(y => y - 1); setBsMonth(11); }
    else setBsMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (bsMonth === 11) { setBsYear(y => y + 1); setBsMonth(0); }
    else setBsMonth(m => m + 1);
  };

  const openAddModal = (dateISO) => {
    setAddDate(dateISO);
    setAddForm({ title: '', description: '', type: 'event', organizerContactName: '', organizerContactPosition: '', organizerPhone: '' });
    setAddError('');
    setShowAdd(true);
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    if (!addDate) { setAddError('Date is required'); return; }
    if (!addForm.title.trim()) { setAddError('Title is required'); return; }
    setAddSaving(true); setAddError('');
    try {
      await api.post('/calendar', { ...addForm, date: addDate });
      setShowAdd(false);
      loadEvents();
    } catch (err) {
      setAddError(err.response?.data?.message ?? 'Failed to create event');
    } finally { setAddSaving(false); }
  };

  const deleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/calendar/${id}`);
      setEvents(ev => ev.filter(e => e._id !== id));
      setSelectedDay(null);
    } catch { /* ignore */ }
  };

  const updateContactStatus = async (eventId, contactStatus) => {
    setStatusUpdating(eventId);
    try {
      const { data } = await api.patch(`/calendar/${eventId}/contact-status`, { contactStatus });
      setEvents(evs => evs.map(e => e._id === eventId ? { ...e, contactStatus: data.data.contactStatus } : e));
      // Update selectedDay popup if open
      setSelectedDay(sd =>
        sd ? { ...sd, events: sd.events.map(e => e._id === eventId ? { ...e, contactStatus } : e) } : sd
      );
    } catch { /* ignore */ } finally {
      setStatusUpdating(null);
    }
  };

  const downloadTemplate = () => {
    const sampleRows = [
      {
        title: 'Kathmandu Marathon',
        date: '2082-01-15',
        type: 'road',
        description: 'Annual road race through Kathmandu',
        organizerContactName: 'Ram Sharma',
        organizerContactPosition: 'Event Director',
        organizerPhone: '9841000000',
      },
      {
        title: 'Shivapuri Trail Run',
        date: '2082-02-05',
        type: 'trail',
        description: 'Mountain trail run',
        organizerContactName: '',
        organizerContactPosition: '',
        organizerPhone: '',
      },
      {
        title: 'Dashain Holiday',
        date: '2082-06-12',
        type: 'holiday',
        description: 'Dashain festival public holiday',
        organizerContactName: '',
        organizerContactPosition: '',
        organizerPhone: '',
      },
      {
        title: 'Fundraiser Event',
        date: '2082-03-20',
        type: 'event',
        description: 'Charity fundraiser',
        organizerContactName: 'Sita Rai',
        organizerContactPosition: 'Coordinator',
        organizerPhone: '9851000000',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, {
      header: ['title', 'date', 'type', 'description', 'organizerContactName', 'organizerContactPosition', 'organizerPhone'],
    });

    // Column widths
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 35 }, { wch: 22 }, { wch: 22 }, { wch: 16 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Events');
    XLSX.writeFile(wb, 'calendar_events_template.xlsx');
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkSaving(true); setBulkResult(null);
    try {
      const buffer = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const VALID_TYPES = ['road', 'trail', 'event', 'holiday'];
      const eventsToUpload = [];
      const parseErrors = [];

      rows.forEach((row, i) => {
        const title           = String(row.title ?? row.Title ?? '').trim();
        const bsDate          = String(row.date  ?? row.Date  ?? '').trim();
        const type            = String(row.type  ?? row.Type  ?? 'event').trim().toLowerCase();
        const description     = String(row.description ?? row.Description ?? '').trim();
        const organizerContactName     = String(row.organizerContactName     ?? row['Organizer Name']     ?? '').trim();
        const organizerContactPosition = String(row.organizerContactPosition ?? row['Organizer Position'] ?? '').trim();
        const organizerPhone           = String(row.organizerPhone           ?? row['Organizer Phone']   ?? '').trim();

        if (!title) { parseErrors.push(`Row ${i + 2}: missing title`); return; }
        if (!VALID_TYPES.includes(type)) { parseErrors.push(`Row ${i + 2}: invalid type "${type}" — use road/trail/event/holiday`); return; }

        const adDate = bsISOtoADISO(bsDate);
        if (!adDate) { parseErrors.push(`Row ${i + 2}: invalid BS date "${bsDate}" — use YYYY-MM-DD (BS)`); return; }

        eventsToUpload.push({ title, date: adDate, type, description, organizerContactName, organizerContactPosition, organizerPhone });
      });

      if (eventsToUpload.length === 0) {
        setBulkResult({ success: false, message: 'No valid rows found', errors: parseErrors });
        return;
      }

      const { data } = await api.post('/calendar/bulk', eventsToUpload);
      setBulkResult({ ...data, errors: [...parseErrors, ...(data.errors ?? [])] });
      loadEvents();
    } catch (err) {
      setBulkResult({ success: false, message: err.response?.data?.message ?? 'Upload failed' });
    } finally { setBulkSaving(false); }
  };

  // Build grid cells (blanks + day cells)
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (day) => bsYear === todayBSYear && bsMonth === todayBSMonth && day === todayBSDay;

  const getBSDayADIso = (day) => {
    const adDate = new NepaliDate(bsYear, bsMonth, day).toJsDate();
    return localISODate(adDate);
  };

  // Saturday is column index 6 (Sun=0 … Sat=6)
  const isSaturday = (day) => (startWeekday + day - 1) % 7 === 6;
  const isDayHoliday = (day) => isSaturday(day) || !!holidaysByBSDay[day];

  return (
    <DashboardLayout title="Calendar">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Nepal Marathon Calendar</h1>
            <p className="text-sm text-gray-400 mt-0.5">Bikram Sambat (BS) Calendar</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <>
                <button
                  onClick={() => openAddModal('')}
                  className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
                >
                  + Add Event
                </button>
                <button
                  onClick={() => { setShowBulk(true); setBulkFile(null); setBulkResult(null); }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  ↑ Bulk Upload
                </button>
              </>
            )}
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ‹ Prev
              </button>
              <span className="text-sm font-semibold text-gray-700 text-center min-w-[8rem]">
                {BS_MONTHS[bsMonth]} {bsYear}
              </span>
              <button onClick={nextMonth} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Next ›
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {Object.entries(TYPE_STYLES).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              {s.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-200" />
            Saturday (off)
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((d) => (
              <div key={d} className={`py-2 text-center text-xs font-semibold uppercase tracking-wide ${d === 'Sat' ? 'text-red-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (!day) return <div key={`blank-${idx}`} className="border-r border-b border-gray-50 h-24" />;
                const dayEvents = eventsByBSDay[day] ?? [];
                const sat = isSaturday(day);
                const holiday = isDayHoliday(day);
                const dateISO = getBSDayADIso(day);

                return (
                  <div
                    key={day}
                    className={`border-r border-b border-gray-50 h-24 p-1.5 flex flex-col cursor-pointer hover:bg-gray-50 transition-colors ${
                      isToday(day) ? 'bg-brand-50' : holiday ? 'bg-red-50' : ''
                    }`}
                    onClick={() => {
                      if (dayEvents.length > 0) setSelectedDay({ day, events: dayEvents, dateISO });
                      else if (canManage) openAddModal(dateISO);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(day) ? 'bg-brand-600 text-white' : sat ? 'text-red-400' : holiday ? 'text-red-500' : 'text-gray-700'
                      }`}>
                        {day}
                      </span>
                      {canManage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openAddModal(dateISO); }}
                          className="text-gray-300 hover:text-brand-500 text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Add event"
                        >
                          +
                        </button>
                      )}
                    </div>
                    {sat && dayEvents.length === 0 && (
                      <p className="text-xs text-red-300 mt-1">Holiday</p>
                    )}
                    <div className="flex flex-wrap gap-0.5 mt-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${TYPE_STYLES[ev.type]?.dot ?? 'bg-gray-400'}`} title={ev.title} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-xs text-gray-400">+{dayEvents.length - 3}</span>}
                    </div>
                    {dayEvents.length > 0 && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{dayEvents[0].title}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming events list */}
        {events.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Events this month</h2>
            <div className="space-y-2">
              {events.map((ev) => {
                const nd = new NepaliDate(new Date(ev.date));
                const s = TYPE_STYLES[ev.type] ?? TYPE_STYLES.event;
                const cs = ev.type !== 'holiday' ? CONTACT_STATUS_STYLES[ev.contactStatus] : null;
                return (
                  <div key={ev._id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800">{ev.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{s.label}</span>
                        {cs && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cs.badge}`}>{cs.label}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {BS_MONTHS[nd.getMonth()]} {nd.getDate()}, {nd.getYear()}
                        {ev.description && ` — ${ev.description}`}
                        {ev.organizerContactName && (
                          <span className="ml-1 text-gray-500">
                            · {ev.organizerContactName}{ev.organizerContactPosition ? ` (${ev.organizerContactPosition})` : ''}
                            {ev.organizerPhone && <a href={`tel:${ev.organizerPhone}`} className="ml-1 text-brand-600 hover:underline">{ev.organizerPhone}</a>}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canUpdateStatus && ev.type !== 'holiday' && (
                        <select
                          value={ev.contactStatus}
                          onChange={(e) => updateContactStatus(ev._id, e.target.value)}
                          disabled={statusUpdating === ev._id}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="pending">Not Contacted</option>
                          <option value="contacted">Contacted</option>
                          <option value="rejected">Rejected</option>
                          <option value="allowed">Allowed</option>
                        </select>
                      )}
                      {canManage && (
                        <button
                          onClick={() => deleteEvent(ev._id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day events popover */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                {BS_MONTHS[bsMonth]} {selectedDay.day}, {bsYear}
              </h3>
              <div className="flex gap-2">
                {canManage && (
                  <button
                    onClick={() => { setSelectedDay(null); openAddModal(selectedDay.dateISO); }}
                    className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                  >
                    + Add Event
                  </button>
                )}
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
            </div>
            <div className="space-y-3">
              {selectedDay.events.map((ev) => {
                const s = TYPE_STYLES[ev.type] ?? TYPE_STYLES.event;
                const cs = ev.type !== 'holiday' ? CONTACT_STATUS_STYLES[ev.contactStatus] : null;
                return (
                  <div key={ev._id} className="p-3 rounded-lg bg-gray-50 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800">{ev.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                          {cs && <span className={`text-xs px-2 py-0.5 rounded-full ${cs.badge}`}>{cs.label}</span>}
                        </div>
                        {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
                        {ev.organizerContactName && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-medium">Organizer:</span> {ev.organizerContactName}
                            {ev.organizerContactPosition && <span className="text-gray-400"> · {ev.organizerContactPosition}</span>}
                            {ev.organizerPhone && <a href={`tel:${ev.organizerPhone}`} className="ml-1 text-brand-600 hover:underline">{ev.organizerPhone}</a>}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">Added by {ev.createdBy?.name}</p>
                      </div>
                      {canManage && (
                        <button onClick={() => deleteEvent(ev._id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Del</button>
                      )}
                    </div>
                    {/* Contact status updater */}
                    {canUpdateStatus && ev.type !== 'holiday' && (
                      <div className="flex items-center gap-2 pl-5">
                        <span className="text-xs text-gray-400">Contact status:</span>
                        <select
                          value={ev.contactStatus}
                          onChange={(e) => updateContactStatus(ev._id, e.target.value)}
                          disabled={statusUpdating === ev._id}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="pending">Not Contacted</option>
                          <option value="contacted">Contacted</option>
                          <option value="rejected">Rejected</option>
                          <option value="allowed">Allowed</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Event modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Add Calendar Event</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={submitEvent} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Date *</label>
                <BSDatePicker value={addDate} onChange={setAddDate} placeholder="Select date" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Title *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={addForm.title}
                  onChange={(e) => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Type *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={addForm.type}
                  onChange={(e) => setAddForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="road">Road</option>
                  <option value="trail">Trail</option>
                  <option value="event">Event</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Description</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={2}
                  value={addForm.description}
                  onChange={(e) => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description…"
                />
              </div>
              {addForm.type !== 'holiday' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Organizer Name</label>
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={addForm.organizerContactName}
                        onChange={(e) => setAddForm(f => ({ ...f, organizerContactName: e.target.value }))}
                        placeholder="Name (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Position</label>
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={addForm.organizerContactPosition}
                        onChange={(e) => setAddForm(f => ({ ...f, organizerContactPosition: e.target.value }))}
                        placeholder="Role / title (optional)"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wide mb-0.5">Phone</label>
                    <input
                      type="tel"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={addForm.organizerPhone}
                      onChange={(e) => setAddForm(f => ({ ...f, organizerPhone: e.target.value }))}
                      placeholder="98XXXXXXXX (optional)"
                    />
                  </div>
                </div>
              )}
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={addSaving} className="text-sm px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {addSaving ? 'Saving…' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Bulk Upload Events</h3>
              <button onClick={() => setShowBulk(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={submitBulk} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Upload an <strong>.xlsx</strong> file with columns:&nbsp;
                  <code className="bg-gray-100 px-1 rounded">title</code>,&nbsp;
                  <code className="bg-gray-100 px-1 rounded">date</code>&nbsp;<span className="text-gray-400">(BS — YYYY-MM-DD)</span>,&nbsp;
                  <code className="bg-gray-100 px-1 rounded">type</code>&nbsp;<span className="text-gray-400">(road / trail / event / holiday)</span>,&nbsp;
                  <code className="bg-gray-100 px-1 rounded">description</code>,&nbsp;
                  <code className="bg-gray-100 px-1 rounded">organizerContactName</code>,&nbsp;
                  <code className="bg-gray-100 px-1 rounded">organizerContactPosition</code>,&nbsp;
                  <code className="bg-gray-100 px-1 rounded">organizerPhone</code>.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex-shrink-0 text-xs px-2.5 py-1.5 border border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 whitespace-nowrap"
                >
                  ↓ Template
                </button>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => { setBulkFile(e.target.files[0] ?? null); setBulkResult(null); }}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />
              {bulkResult && (
                <div className={`text-sm rounded-lg p-3 ${bulkResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {bulkResult.success
                    ? <>{bulkResult.inserted} event{bulkResult.inserted !== 1 ? 's' : ''} imported{bulkResult.skipped ? `, ${bulkResult.skipped} skipped` : ''}.</>
                    : bulkResult.message}
                  {bulkResult.errors?.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                      {bulkResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowBulk(false)} className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Close
                </button>
                <button type="submit" disabled={!bulkFile || bulkSaving} className="text-sm px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {bulkSaving ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CalendarPage;
