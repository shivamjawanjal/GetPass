import { Router } from 'express';
import { studentController } from '../controllers/student.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// GET /api/student/requests
router.get('/requests', authMiddleware, authorizeRoles('student', 'admin'), studentController.getMyRequests);

// POST /api/student/requests
router.post('/requests', authMiddleware, authorizeRoles('student', 'admin'), studentController.createRequest);

// GET /api/student/requests/:id
router.get(
  '/requests/:id',
  authMiddleware,
  authorizeRoles('student', 'clerk', 'guard', 'admin'),
  studentController.getPassDetails
);

// POST /api/student/requests/:id/cancel
router.post(
  '/requests/:id/cancel',
  authMiddleware,
  authorizeRoles('student', 'admin'),
  studentController.cancelRequest
);

// PUT /api/student/profile/:id
router.put('/profile/:id', authMiddleware, authorizeRoles('student', 'admin'), studentController.updateProfile);

export default router;
