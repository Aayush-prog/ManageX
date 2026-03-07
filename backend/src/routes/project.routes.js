import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  createTask,
} from '../controllers/project.controller.js';

const router = Router();
router.use(authenticate);

const managerGate = allowRoles('manager', 'admin');

router.get('/',                      getProjects);
router.post('/',                     managerGate, createProject);
router.get('/:id',                   getProjectById);
router.patch('/:id',                 managerGate, updateProject);
router.delete('/:id',               managerGate, deleteProject);
router.post('/:projectId/tasks',     managerGate, createTask);

export default router;
