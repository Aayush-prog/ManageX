import nodemailer from 'nodemailer';
import env from '../config/env.js';

let _transporter = null;

const getTransporter = () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return _transporter;
};

/**
 * Send an email. Errors are caught and logged — never throws so it never breaks the main flow.
 */
export const sendEmail = async ({ to, subject, html }) => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('[email] SMTP not configured — skipping email:', subject);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    console.log(`[email] Sent "${subject}" → ${Array.isArray(to) ? to.join(', ') : to}`);
  } catch (err) {
    console.error('[email] Failed to send:', err.message);
  }
};
