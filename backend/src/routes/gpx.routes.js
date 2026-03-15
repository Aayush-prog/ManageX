import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import GpxTrack from '../models/GpxTrack.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// All authenticated users can list, upload, and view
router.use(authenticate);

// GET /api/gpx — list all tracks
router.get('/', async (req, res, next) => {
  try {
    const tracks = await GpxTrack.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tracks });
  } catch (err) { next(err); }
});

// POST /api/gpx — upload a new GPX file
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'GPX file required' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.gpx') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Only .gpx files allowed' });
    }

    const track = await GpxTrack.create({
      title:      req.body.title || req.file.originalname,
      description:req.body.description || '',
      filename:   req.file.originalname,
      url:        `/uploads/${req.file.filename}`,
      uploadedBy: req.user._id,
    });

    await track.populate('uploadedBy', 'name');
    res.status(201).json({ success: true, data: track });
  } catch (err) { next(err); }
});

// DELETE /api/gpx/:id — admin or the uploader
router.delete('/:id', async (req, res, next) => {
  try {
    const track = await GpxTrack.findById(req.params.id);
    if (!track) return res.status(404).json({ success: false, message: 'Track not found' });

    const isOwner = track.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.permissionLevel === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Remove file from disk
    const filePath = path.resolve(__dirname, '../../../uploads', path.basename(track.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await track.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
