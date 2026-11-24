import { Router } from 'express';
import { guardController } from '../controllers/guard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware, authorizeRoles('guard', 'admin'));

// POST /api/guard/verify
router.post('/verify', guardController.verifyGatePassToken);

// GET /api/guard/lookup?q=
router.get('/lookup', guardController.lookupPasses);

// POST /api/guard/check-in
router.post('/check-in', guardController.checkInPass);

// GET /api/guard/scans
router.get('/scans', guardController.getScanHistory);

export default router;
