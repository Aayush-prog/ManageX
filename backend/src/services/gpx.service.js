import fs       from 'fs';
import path     from 'path';
import GpxFile  from '../models/GpxFile.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

export const listGpxFiles = () =>
  GpxFile.find().populate('uploadedBy', 'name').sort({ createdAt: -1 }).lean();

export const createGpxFile = async ({ filename, originalName, uploadedById }) => {
  const name = originalName?.replace(/\.gpx$/i, '') || filename;
  const doc  = await GpxFile.create({ name, filename, originalName, uploadedBy: uploadedById });
  return GpxFile.findById(doc._id).populate('uploadedBy', 'name').lean();
};

export const deleteGpxFile = async (id, userId, isAdmin) => {
  const file = await GpxFile.findById(id).lean();
  if (!file) {
    const e = new Error('GPX file not found');
    e.statusCode = 404;
    throw e;
  }
  if (!isAdmin && file.uploadedBy?.toString() !== userId) {
    const e = new Error('Not authorised to delete this file');
    e.statusCode = 403;
    throw e;
  }
  try { fs.unlinkSync(path.join(UPLOAD_DIR, file.filename)); } catch (_) {}
  await GpxFile.findByIdAndDelete(id);
  return file;
};
