import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware, authorizeRoles('admin'));

// GET /api/admin/stats
router.get('/stats', adminController.getDashboardStats);

// GET /api/admin/users
router.get('/users', adminController.getUsersByRole);

// POST /api/admin/users/bulk (Must precede /:id)
router.post('/users/bulk', adminController.bulkCreateUsers);

// POST /api/admin/users
router.post('/users', adminController.createUser);

// PUT /api/admin/users/:id
router.put('/users/:id', adminController.updateUser);

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminController.deleteUser);

// PATCH /api/admin/users/:id/toggle-status
router.patch('/users/:id/toggle-status', adminController.toggleStatus);

// GET /api/admin/passes
router.get('/passes', adminController.getAllPasses);

// GET /api/admin/reports?days=7
router.get('/reports', adminController.getSystemReports);

export default router;
