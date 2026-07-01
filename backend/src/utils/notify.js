import webpush from 'web-push';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import env from '../config/env.js';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

async function sendPush(userId, payload) {
  if (!env.VAPID_PUBLIC_KEY) return;
  const subs = await PushSubscription.find({ user: userId }).lean();
  const dead = [];
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      );
    } catch (err) {
      // 404/410 = subscription expired — remove it
      if (err.statusCode === 404 || err.statusCode === 410) dead.push(sub.endpoint);
    }
  }));
  if (dead.length) await PushSubscription.deleteMany({ endpoint: { $in: dead } });
}

export const notify = (recipient, { type, title, message, link = null }) => {
  Notification.create({ recipient, type, title, message, link }).catch(() => {});
  sendPush(recipient, { type, title, body: message, url: link, icon: '/logo.png', badge: '/logo.png' }).catch(() => {});
};
