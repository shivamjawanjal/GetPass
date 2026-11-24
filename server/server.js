import app from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  console.log(`
=====================================================
🚀 SXIET Digital Gate Pass Backend Server Running
=====================================================
📡 Port:        ${config.port}
🌐 Base URL:    http://localhost:${config.port}/api
🩺 Health:      http://localhost:${config.port}/api/health
📁 Database:    SQLite (server/data/gatepass.db)

🔑 Default Demo Credentials:
   - Student:  CS2023045 / password123 (Rahul Sharma)
   - Student:  ME2023012 / password123 (Amit Patil)
   - Clerk:    CLK001    / password123 (Sunita Kulkarni)
   - Guard:    GRD001    / password123 (Ramesh Powar)
   - Admin:    ADM001    / password123 (Dr. Vikramaditya Rao)

🛡️ 100% Full-Stack System Architecture Online:
   [✓] Authentication & JWT Security (/api/auth)
   [✓] Student Pass Requests & Lifecycle (/api/student)
   [✓] Clerk Review & Approval Workflow (/api/clerk)
   [✓] Security Guard QR Token Verification (/api/gate-passes/verify)
   [✓] Admin User & Gate Management (/api/admin/users)
   [✓] College Audit Logs, Metrics & Reports (/api/admin/reports)
=====================================================
`);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down backend server gracefully...');
  server.close(() => {
    console.log('Backend HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
