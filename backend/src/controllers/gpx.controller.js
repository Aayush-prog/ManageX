import { listGpxFiles, createGpxFile, deleteGpxFile } from '../services/gpx.service.js';

export const getGpxFiles = async (req, res, next) => {
  try {
    const files = await listGpxFiles();
    res.json({ success: true, data: files });
  } catch (err) { next(err); }
};

export const uploadGpxFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No GPX file uploaded' });
    }
    const file = await createGpxFile({
      filename:     req.file.filename,
      originalName: req.file.originalname,
      uploadedById: req.user.id,
    });
    res.status(201).json({ success: true, data: file });
  } catch (err) { next(err); }
};

export const deleteGpxFileCtrl = async (req, res, next) => {
  try {
    const file = await deleteGpxFile(
      req.params.id,
      req.user.id,
      req.user.permissionLevel === 'admin',
    );
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
};
