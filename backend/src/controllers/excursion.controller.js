import {
  createExcursionService,
  getExcursionsService,
  deleteExcursionService,
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
