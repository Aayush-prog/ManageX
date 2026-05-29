import {
  createExcursionService,
  getExcursionsService,
  deleteExcursionService,
  attachGpxService,
  detachGpxService,
} from '../services/excursion.service.js';

export const getExcursions = async (req, res, next) => {
  try {
    const data = await getExcursionsService();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const createExcursion = async (req, res, next) => {
  try {
    const { topic, startDate, endDate } = req.body;
    if (!topic || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'topic, startDate and endDate are required' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ success: false, message: 'startDate must be before or equal to endDate' });
    }
    const result = await createExcursionService(topic, startDate, endDate, req.user.id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteExcursion = async (req, res, next) => {
  try {
    const excursion = await deleteExcursionService(req.params.id);
    return res.json({ success: true, data: excursion });
  } catch (err) { next(err); }
};

export const uploadGpx = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No GPX file uploaded' });
    }
    const excursion = await attachGpxService(req.params.id, req.file.filename);
    return res.json({ success: true, data: excursion });
  } catch (err) { next(err); }
};

export const removeGpx = async (req, res, next) => {
  try {
    const excursion = await detachGpxService(req.params.id);
    return res.json({ success: true, data: excursion });
  } catch (err) { next(err); }
};
