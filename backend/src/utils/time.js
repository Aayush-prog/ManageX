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
 * Resolves a user's work schedule with sensible fallbacks to env defaults.
 * `user` is a partial user object with any subset of the schedule fields.
 */
export const getUserSchedule = (user = {}) => ({
  startHour:    user.workStartHour    ?? env.LATE_HOUR,
  startMinute:  user.workStartMinute  ?? 0,
  endHour:      user.workEndHour      ?? env.CLOCKOUT_HOUR,
  endMinute:    user.workEndMinute    ?? env.CLOCKOUT_MINUTE,
  graceMinutes: user.lateGraceMinutes ?? env.LATE_MINUTE,
});

/**
 * Returns true if clockIn (in local TZ) is strictly after the user's
 * work start time + graceMinutes.
 */
export const isLateClockIn = (clockIn = new Date(), user = {}) => {
  const { hour, minute } = getLocalTimeParts(clockIn);
  const sched = getUserSchedule(user);
  const cutoff = sched.startHour * 60 + sched.startMinute + sched.graceMinutes;
  return hour * 60 + minute > cutoff;
};

/**
 * Returns true if the given time is outside the user's allowed check-in
 * window. Window widens 1 hour before start and 2 hours after end so users
 * can still swipe in a bit early / stay late.
 */
export const isOutsideCheckInWindow = (date = new Date(), user = {}) => {
  const { hour, minute } = getLocalTimeParts(date);
  const sched = getUserSchedule(user);
  const nowMin   = hour * 60 + minute;
  const startMin = Math.max(0, sched.startHour * 60 + sched.startMinute - 60);
  const endMin   = Math.min(24 * 60, sched.endHour * 60 + sched.endMinute + 120);
  return nowMin < startMin || nowMin >= endMin;
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
 * Returns a Date object for today at the user's workEnd time in the
 * configured local timezone. Uses explicit ISO 8601 offset so parsing is exact.
 * If no user is passed, falls back to env CLOCKOUT_HOUR/MINUTE.
 */
export const getClockOutTime = (date = new Date(), user = {}) => {
  const localDate = getLocalDateString(date);
  const offset    = getTimezoneOffset(date);
  const sched     = getUserSchedule(user);
  const h = String(sched.endHour).padStart(2, '0');
  const m = String(sched.endMinute).padStart(2, '0');
  return new Date(`${localDate}T${h}:${m}:00${offset}`);
};

/**
 * Builds a Date object for the given YYYY-MM-DD date string at hour:minute
 * in the configured local timezone.
 */
export const makeLocalDateTime = (dateStr, hour, minute = 0) => {
  const ref   = new Date(dateStr + 'T12:00:00Z');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: env.TIMEZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(ref);
  const raw   = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = raw.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  const offset = match
    ? `${match[1]}${match[2].padStart(2, '0')}:${(match[3] ?? '00').padStart(2, '0')}`
    : '+00:00';
  return new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00${offset}`);
};

/**
 * Latest local YYYY-MM-DD that should count toward "absent" calculations.
 * Today is only considered closed at/after 23:00 local time — before that, the
 * cutoff is yesterday so today doesn't yet show as absent.
 */
export const getAbsenceCutoffDate = (date = new Date()) => {
  const today = getLocalDateString(date);
  const { hour } = getLocalTimeParts(date);
  if (hour >= 23) return today;
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
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

