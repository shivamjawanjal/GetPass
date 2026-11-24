import { Router } from 'express';
import { clerkController } from '../controllers/clerk.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware, authorizeRoles('clerk', 'admin'));

// GET /api/clerk/requests/pending (Must precede /:id)
router.get('/requests/pending', clerkController.getPendingRequests);

// POST /api/clerk/requests/bulk
router.post('/requests/bulk', clerkController.bulkAction);

// GET /api/clerk/requests
router.get('/requests', clerkController.getAllRequests);

// GET /api/clerk/requests/:id
router.get('/requests/:id', clerkController.getRequestDetails);

// POST /api/clerk/requests/:id/approve
router.post('/requests/:id/approve', clerkController.approveRequest);

// POST /api/clerk/requests/:id/reject
router.post('/requests/:id/reject', clerkController.rejectRequest);

export default router;
