import { Router } from 'express';
import { authenticate, allowSuperAdmin, allowRoles } from '../middleware/auth.js';
import * as ctrl from '../controllers/team.controller.js';

const router = Router();
router.use(authenticate);

// My teams — any authenticated user
router.get('/my', ctrl.getMyTeams);

// List all teams — super admin sees all; others see their own
router.get('/', ctrl.listTeams);

// Team CRUD — super admin only
router.post('/',    allowSuperAdmin(), ctrl.createTeam);
router.get('/:id',  ctrl.getTeam);
router.patch('/:id', allowSuperAdmin(), ctrl.updateTeam);
router.delete('/:id', allowSuperAdmin(), ctrl.deleteTeam);

// Team members — super admin can manage all; team admin can manage their own team
router.get('/:id/members',             allowRoles('coordinator', 'admin'), ctrl.getTeamMembers);
router.post('/:id/members',            allowRoles('admin'), ctrl.addTeamMember);
router.patch('/:id/members/:userId',   allowRoles('admin'), ctrl.updateTeamMemberRole);
router.delete('/:id/members/:userId',  allowRoles('admin'), ctrl.removeTeamMember);

export default router;
