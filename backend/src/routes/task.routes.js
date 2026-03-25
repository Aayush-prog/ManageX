import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { updateTask, deleteTask, addComment, editComment, deleteComment, getMyTasks } from '../controllers/project.controller.js';
import { upload } from '../middleware/upload.js';
import Task from '../models/Task.js';

const router = Router();
router.use(authenticate);

// IMPORTANT: specific path before parameterised path
router.get('/my-tasks',         getMyTasks);
router.patch('/:id',            updateTask);
router.delete('/:id',           allowRoles('manager', 'admin'), deleteTask);
router.post('/:id/comments',                addComment);
router.patch('/:id/comments/:commentId',   editComment);
router.delete('/:id/comments/:commentId',  deleteComment);

// POST /tasks/:id/attachments  — multipart/form-data field name: "file"
router.post('/:id/attachments', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const attachment = {
      name:       req.file.originalname,
      url:        `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id,
    };
    task.attachments.push(attachment);
    await task.save();

    return res.status(201).json({ success: true, data: task.attachments.at(-1) });
  } catch (err) { next(err); }
});

export default router;
