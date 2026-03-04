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
