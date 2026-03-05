import NepaliDate from 'nepali-date-converter';

export const BS_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert any JS Date or ISO string to a NepaliDate instance
const toND = (input) => new NepaliDate(input instanceof Date ? input : new Date(input));

// "Falgun 20, 2082"
export const fmtBSDate = (isoOrDate) => {
  if (!isoOrDate) return '—';
  try {
    const nd = toND(isoOrDate);
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getDate()}, ${nd.getYear()}`;
  } catch { return '—'; }
};

// "Falgun 20" (no year)
export const fmtBSShort = (isoOrDate) => {
  if (!isoOrDate) return '—';
  try {
    const nd = toND(isoOrDate);
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getDate()}`;
  } catch { return '—'; }
};

// For date-only strings like "2026-03-04" (avoids timezone shift)
export const fmtBSDateStr = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const nd = new NepaliDate(new Date(dateStr + 'T00:00:00'));
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getDate()}, ${nd.getYear()}`;
  } catch { return '—'; }
};

// "Falgun 20" for date-only strings
export const fmtBSShortStr = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const nd = new NepaliDate(new Date(dateStr + 'T00:00:00'));
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getDate()}`;
  } catch { return '—'; }
};

// AD "YYYY-MM" → "Falgun 2082" (uses 15th of AD month as reference)
export const fmtBSMonthYear = (adMonthStr) => {
  if (!adMonthStr) return '—';
  try {
    const [y, mo] = adMonthStr.split('-').map(Number);
    const nd = new NepaliDate(new Date(y, mo - 1, 15));
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getYear()}`;
  } catch { return adMonthStr; }
};

// Current AD month key "YYYY-MM" (for API calls — stays AD)
export const curADMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Current BS month label for display: "Falgun 2082"
export const curBSMonthLabel = () => {
  try {
    const nd = new NepaliDate(new Date());
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getYear()}`;
  } catch { return ''; }
};

// AD year → BS year for mid-year (July 1) reference: 2026 → "2083"
export const adYearToBSYear = (adYear) => {
  try {
    const nd = new NepaliDate(new Date(adYear, 6, 1)); // July 1
    return nd.getYear();
  } catch { return adYear; }
};

// AD month (1-12) + AD year → BS month name for dropdown label
export const adMonthToBSLabel = (adYear, adMonth) => {
  try {
    const nd = new NepaliDate(new Date(adYear, adMonth - 1, 15));
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getYear()}`;
  } catch { return ''; }
};

// Today in full: "Wednesday, Falgun 20, 2082"
export const todayBSFull = () => {
  try {
    const adDate = new Date();
    const nd = new NepaliDate(adDate);
    return `${WEEKDAYS[adDate.getDay()]}, ${BS_MONTHS[nd.getMonth()]} ${nd.getDate()}, ${nd.getYear()}`;
  } catch { return ''; }
};

// "HH:MM" — 24-hour time from any ISO string or Date
export const fmtTime = (isoOrDate) => {
  if (!isoOrDate) return '—';
  try {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '—'; }
};

// BS year + month (0-indexed) → { year, month } in AD (1-indexed month)
// Uses the AD date of Baisakh/month-1 of BS month to determine AD year+month
export const bsToADYearMonth = (bsYear, bsMonthIndex) => {
  const d = new NepaliDate(bsYear, bsMonthIndex, 1).toJsDate();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

// Current BS year
export const currentBSYear = () => {
  try { return new NepaliDate(new Date()).getYear(); } catch { return 2082; }
};

// Current BS month/year as { year, month } (month 0-indexed)
export const currentBSMonthYear = () => {
  try {
    const nd = new NepaliDate(new Date());
    return { year: nd.getYear(), month: nd.getMonth() };
  } catch { return { year: 2082, month: 0 }; }
};

// Format a JS Date as local YYYY-MM-DD (avoids UTC shift bugs)
const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// BS year → AD ISO date range (Baisakh 1 → Chaitra last day)
export const bsYearToADRange = (bsYear) => {
  const start = new NepaliDate(bsYear, 0, 1).toJsDate();
  const nextYearStart = new NepaliDate(bsYear + 1, 0, 1).toJsDate();
  const end = new Date(nextYearStart.getTime() - 86_400_000);
  return { startISO: localISO(start), endISO: localISO(end) };
};

// BS month → AD ISO date range
export const bsMonthToADRange = (bsYear, bsMonthIndex) => {
  const start = new NepaliDate(bsYear, bsMonthIndex, 1).toJsDate();
  let nextYear = bsYear, nextMonth = bsMonthIndex + 1;
  if (nextMonth === 12) { nextMonth = 0; nextYear++; }
  const nextMonthStart = new NepaliDate(nextYear, nextMonth, 1).toJsDate();
  const end = new Date(nextMonthStart.getTime() - 86_400_000);
  return {
    startISO: localISO(start),
    endISO:   localISO(end),
  };
};

// "Falgun 20, 2082 HH:MM" for datetime display
export const fmtBSDateTime = (isoOrDate) => {
  if (!isoOrDate) return '—';
  try {
    const adDate = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    const nd = new NepaliDate(adDate);
    const h = String(adDate.getHours()).padStart(2, '0');
    const m = String(adDate.getMinutes()).padStart(2, '0');
    return `${BS_MONTHS[nd.getMonth()]} ${nd.getDate()}, ${nd.getYear()} ${h}:${m}`;
  } catch { return '—'; }
};
