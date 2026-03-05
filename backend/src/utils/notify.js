import Notification from '../models/Notification.js';

/**
 * Fire-and-forget in-app notification creator.
 * Never throws — notification failure must not break the main flow.
 */
export const notify = (recipient, { type, title, message, link = null }) => {
  Notification.create({ recipient, type, title, message, link }).catch(() => {});
};
