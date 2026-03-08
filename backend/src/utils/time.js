import env from '../config/env.js';

/**
 * Returns the local date string "YYYY-MM-DD" in the configured timezone.
 * Used as the canonical attendance date key.
 */
export const getLocalDateString = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: env.TIMEZONE }).format(date);

/**
 * Returns { hour, minute } in the configured timezone.
 */
export const getLocalTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  return {
    hour:   parseInt(parts.find((p) => p.type === 'hour').value,   10),
    minute: parseInt(parts.find((p) => p.type === 'minute').value, 10),
  };
};

/**
 * Returns true if clockIn time (in local TZ) is strictly after LATE_HOUR:00.
 * e.g. LATE_HOUR=10 → 10:00:00 is NOT late, 10:00:01 IS late.
 */
export const isLateClockIn = (clockIn = new Date()) => {
  const { hour, minute } = getLocalTimeParts(clockIn);
  return hour * 60 + minute > env.LATE_HOUR * 60 + env.LATE_MINUTE;
};

/**
 * Returns true if the given time is outside the allowed check-in window.
 * Window: CHECKIN_START_HOUR (inclusive) to CHECKIN_END_HOUR (inclusive).
 * e.g. window 6–21 → 5:59 and 21:01 return true (outside).
 */
export const isOutsideCheckInWindow = (date = new Date()) => {
  const { hour } = getLocalTimeParts(date);
  return hour < env.CHECKIN_START_HOUR || hour >= env.CHECKIN_END_HOUR;
};

/**
 * Returns the UTC offset string for the configured timezone, e.g. "+05:45".
 * Uses Intl 'longOffset' timeZoneName which gives "GMT+05:45" style strings.
 */
const getTimezoneOffset = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: env.TIMEZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(date);

  const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  // raw is "GMT+5:45" or "GMT+05:45" — normalize to ±HH:MM
  const match = raw.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  if (!match) return '+00:00';
  return `${match[1]}${match[2].padStart(2, '0')}:${(match[3] ?? '00').padStart(2, '0')}`;
};

/**
 * Returns a Date object for today at CLOCKOUT_HOUR:CLOCKOUT_MINUTE in the
 * configured local timezone. Uses explicit ISO 8601 offset so parsing is exact.
 * e.g. "2024-03-15T17:00:00+05:45" → correct UTC timestamp.
 */
export const getClockOutTime = (date = new Date()) => {
  const localDate = getLocalDateString(date);
  const offset    = getTimezoneOffset(date);
  const h = String(env.CLOCKOUT_HOUR).padStart(2, '0');
  const m = String(env.CLOCKOUT_MINUTE).padStart(2, '0');
  return new Date(`${localDate}T${h}:${m}:00${offset}`);
};

/**
 * Returns true if the given date is a Saturday in the configured timezone.
 */
export const isLocalDaySaturday = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.TIMEZONE,
    weekday: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'weekday')?.value === 'Sat';
};

/**
 * Strips IPv4-mapped IPv6 prefix (::ffff:) so IP comparison works
 * whether Express sees IPv4 or IPv6-mapped addresses.
 */
export const normalizeIP = (ip = '') => ip.replace(/^::ffff:/, '').trim();

/** Convert an IPv4 string to a 32-bit integer. */
const ipToInt = (ip) =>
  ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

/**
 * Returns true if the normalized IP matches any configured OFFICE_IP entry.
 * OFFICE_IP can be a comma-separated list of exact IPs or CIDR ranges:
 *   "202.51.80.0/24,10.0.0.1"
 */
export const isOfficeIP = (ip) => {
  const normalized = normalizeIP(ip);
  const officeList = env.OFFICE_IP.split(',').map((s) => s.trim()).filter(Boolean);

  return officeList.some((entry) => {
    if (entry.includes('/')) {
      // CIDR match e.g. 202.51.80.0/24
      const [network, prefixStr] = entry.split('/');
      const prefix = parseInt(prefixStr, 10);
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return (ipToInt(normalized) & mask) === (ipToInt(network) & mask);
    }
    // Exact match
    return normalized === entry;
  });
};
