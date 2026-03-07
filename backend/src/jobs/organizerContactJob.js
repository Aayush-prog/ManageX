import CalendarEvent from '../models/CalendarEvent.js';
import User from '../models/User.js';
import { notify } from '../utils/notify.js';
import { sendEmail } from '../utils/email.js';

const POLL_INTERVAL = 6 * 60 * 60 * 1000; // run every 6 hours
const NOTIFY_COOLDOWN_MS = 23 * 60 * 60 * 1000; // don't re-notify within 23 hours

const checkOrganizerContacts = async () => {
  try {
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setDate(oneMonthFromNow.getDate() + 30);

    const notifyBefore = new Date(now.getTime() - NOTIFY_COOLDOWN_MS);

    // Find non-holiday events within the next 30 days where organizer is not yet contacted
    const events = await CalendarEvent.find({
      type: { $in: ['road', 'trail', 'event'] },
      date: { $gte: now, $lte: oneMonthFromNow },
      contactStatus: 'pending',
      $or: [
        { contactNotifiedAt: null },
        { contactNotifiedAt: { $lte: notifyBefore } },
      ],
    }).lean();

    if (!events.length) return;

    const recipients = await User.find({
      permissionLevel: { $in: ['finance', 'manager', 'admin'] },
    }).select('name email _id permissionLevel').lean();

    if (!recipients.length) return;

    for (const event of events) {
      const daysUntil = Math.ceil((new Date(event.date) - now) / 86_400_000);
      const dateStr = new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // In-app notifications
      for (const user of recipients) {
        notify(user._id, {
          type: 'warning',
          title: 'Organizer not contacted',
          message: `"${event.title}" (${event.type}) is ${daysUntil} day${daysUntil === 1 ? '' : 's'} away and the organizer has not been contacted yet.`,
          link: '/calendar',
        });
      }

      // Email notification
      const emails = recipients.map((u) => u.email).filter(Boolean);
      if (emails.length) {
        await sendEmail({
          to: emails,
          subject: `Action Required: Organizer not contacted for "${event.title}"`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#dc2626">Organizer Contact Reminder</h2>
              <p>The following event is approaching and the organizer has <strong>not been contacted</strong>:</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;color:#6b7280;font-size:13px">Event</td><td style="padding:8px;font-weight:600">${event.title}</td></tr>
                <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280;font-size:13px">Type</td><td style="padding:8px;text-transform:capitalize">${event.type}</td></tr>
                <tr><td style="padding:8px;color:#6b7280;font-size:13px">Date</td><td style="padding:8px">${dateStr} (${daysUntil} day${daysUntil === 1 ? '' : 's'} away)</td></tr>
                ${event.organizerContactName ? `<tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280;font-size:13px">Organizer</td><td style="padding:8px">${event.organizerContactName}${event.organizerContactPosition ? ` <span style="color:#9ca3af">(${event.organizerContactPosition})</span>` : ''}</td></tr>` : ''}
              </table>
              <p>Please update the contact status in the <a href="/calendar" style="color:#2563eb">Calendar</a> once the organizer has been reached.</p>
            </div>
          `,
        });
      }

      // Mark as notified
      await CalendarEvent.findByIdAndUpdate(event._id, { contactNotifiedAt: now });
      console.log(`[organizerContact] Notified ${recipients.length} user(s) about "${event.title}"`);
    }
  } catch (err) {
    console.error('[organizerContact] Error:', err.message);
  }
};

export const startOrganizerContactJob = () => {
  // Run immediately on start, then every 6 hours
  checkOrganizerContacts();
  const interval = setInterval(checkOrganizerContacts, POLL_INTERVAL);
  console.log('[organizerContact] Started — checking every 6 hours for uncontacted organizers within 30 days');
  return interval;
};
