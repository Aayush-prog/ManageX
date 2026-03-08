import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import CalendarEvent from '../models/CalendarEvent.js';

const router = Router();
router.use(authenticate);

const VALID_TYPES = ['road', 'trail', 'event', 'holiday'];

// GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const query = {};
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start + 'T00:00:00');
      if (end)   query.date.$lte = new Date(end   + 'T23:59:59');
    }
    const events = await CalendarEvent.find(query)
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .lean();
    return res.json({ success: true, data: events });
  } catch (err) { next(err); }
});

// POST /api/calendar — manager/admin only
router.post('/', allowRoles('manager', 'admin'), async (req, res, next) => {
  try {
    const { title, description, date, type, organizerContactName, organizerContactPosition, organizerPhone } = req.body;
    if (!title || !date || !type) {
      return res.status(400).json({ success: false, message: 'title, date and type are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const event = await CalendarEvent.create({
      title,
      description,
      date: new Date(date + 'T00:00:00'),
      type,
      organizerContactName:     organizerContactName     || '',
      organizerContactPosition: organizerContactPosition || '',
      organizerPhone:           organizerPhone           || '',
      createdBy: req.user.id,
    });
    await event.populate('createdBy', 'name');
    return res.status(201).json({ success: true, data: event });
  } catch (err) { next(err); }
});

// POST /api/calendar/bulk — accepts pre-parsed JSON array from frontend
// Each item: { title, date (AD ISO), type, description, organizerContact? }
router.post('/bulk', allowRoles('manager', 'admin'), async (req, res, next) => {
  try {
    const rows = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Expected a non-empty array of events' });
    }

    const docs = [];
    const errors = [];

    rows.forEach((row, i) => {
      const { title, date, type, description = '', organizerContactName = '', organizerContactPosition = '', organizerPhone = '' } = row;
      if (!title) { errors.push(`Row ${i + 1}: missing title`); return; }
      if (!date || isNaN(Date.parse(date))) { errors.push(`Row ${i + 1}: invalid date`); return; }
      if (!VALID_TYPES.includes(type)) { errors.push(`Row ${i + 1}: invalid type "${type}"`); return; }
      docs.push({ title, description, date: new Date(date + 'T00:00:00'), type, organizerContactName, organizerContactPosition, organizerPhone, createdBy: req.user.id });
    });

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows found', errors });
    }

    const inserted = await CalendarEvent.insertMany(docs, { ordered: false });
    return res.status(201).json({
      success: true,
      inserted: inserted.length,
      skipped: rows.length - inserted.length,
      errors,
    });
  } catch (err) { next(err); }
});

// PATCH /api/calendar/:id/contact-status — finance/manager/admin can update
router.patch('/:id/contact-status', allowRoles('finance', 'manager', 'admin'), async (req, res, next) => {
  try {
    const { contactStatus } = req.body;
    const VALID_STATUSES = ['pending', 'contacted', 'rejected', 'allowed'];
    if (!VALID_STATUSES.includes(contactStatus)) {
      return res.status(400).json({ success: false, message: `contactStatus must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      { contactStatus },
      { new: true }
    ).populate('createdBy', 'name');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    return res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

// DELETE /api/calendar/:id — manager/admin only
router.delete('/:id', allowRoles('manager', 'admin'), async (req, res, next) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    return res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
