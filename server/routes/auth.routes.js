import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

// POST /api/auth/logout
router.post('/logout', optionalAuthMiddleware, authController.logout);

// POST /api/auth/demo-switch
router.post('/demo-switch', authController.demoSwitch);

export default router;
