import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload }       from '../middleware/upload.js';
import { getGpxFiles, uploadGpxFile, deleteGpxFileCtrl } from '../controllers/gpx.controller.js';

const router = Router();
router.use(authenticate);

router.get   ('/',    getGpxFiles);
router.post  ('/',    upload.single('gpx'), uploadGpxFile);
router.delete('/:id', deleteGpxFileCtrl);

export default router;
