import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import env from '../config/env.js';

const router = Router();
router.use(authenticate);

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (_req, res) => {
  res.json({ success: true, publicKey: env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user.id, endpoint, keys },
      { upsert: true, new: true }
    );
    return res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await PushSubscription.deleteOne({ endpoint, user: req.user.id });
    return res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
