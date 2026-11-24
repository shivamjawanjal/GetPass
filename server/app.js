import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import clerkRoutes from './routes/clerk.routes.js';
import guardRoutes from './routes/guard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { guardController } from './controllers/guard.controller.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { authorizeRoles } from './middleware/role.middleware.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*', // Allow development origins including Vite localhost:5173
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Development Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'SXIET Digital Gate Pass System Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    features: [
      'JWT Authentication',
      'Student Gate Pass Lifecycle',
      'Clerk Review & Approval Workflow',
      'Security Guard QR Verification',
      'Persistent SQLite Database',
    ],
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/clerk', clerkRoutes);
app.use('/api/guard', guardRoutes);
app.use('/api/admin', adminRoutes);

// Direct alias for /api/gate-passes/verify (used by guard scanner)
app.post(
  '/api/gate-passes/verify',
  authMiddleware,
  authorizeRoles('guard', 'admin'),
  guardController.verifyGatePassToken
);

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
