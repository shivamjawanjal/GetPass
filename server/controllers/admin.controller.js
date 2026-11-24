import { dbService } from '../config/db.js';

export const adminController = {
  // GET /api/admin/stats
  async getDashboardStats(req, res, next) {
    try {
      const users = dbService.getAllUsers();
      const passes = dbService.getAllPasses();
      const scans = dbService.getAllScanLogs();

      const stats = {
        totalStudents: users.filter((u) => u.role === 'student').length,
        totalClerks: users.filter((u) => u.role === 'clerk').length,
        totalGuards: users.filter((u) => u.role === 'guard').length,
        totalPasses: passes.length,
        pendingPasses: passes.filter((p) => p.status === 'pending').length,
        approvedPasses: passes.filter((p) => p.status === 'approved').length,
        usedPasses: passes.filter((p) => p.status === 'used').length,
        rejectedPasses: passes.filter((p) => p.status === 'rejected').length,
        totalScans: scans.length,
      };

      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/users
  async getUsersByRole(req, res, next) {
    try {
      const { role } = req.query;
      if (role) {
        const filtered = dbService.getUsersByRole(role);
        return res.status(200).json(filtered);
      }
      const all = dbService.getAllUsers();
      res.status(200).json(all);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/admin/users
  async createUser(req, res, next) {
    try {
      const userData = req.body;
      if (!userData.email || !userData.name || !userData.role || !userData.rollNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, roll/staff number, and role are required fields.',
        });
      }

      const conflict = dbService.findConflictUser({
        email: userData.email,
        rollNumber: userData.rollNumber,
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email or roll/staff number already exists.',
        });
      }

      const created = dbService.createUser(userData);
      res.status(201).json(created);
    } catch (err) {
      if (err?.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email or roll/staff number already exists.',
        });
      }
      next(err);
    }
  },

  // PUT /api/admin/users/:id
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const existing = dbService.getUserById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `User with ID ${id} not found.`,
        });
      }

      const updates = req.body;
      if (updates.email || updates.rollNumber) {
        const conflict = dbService.findConflictUser({
          email: updates.email ?? existing.email,
          rollNumber: updates.rollNumber ?? existing.rollNumber,
          excludeId: id,
        });
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: 'Another user already uses this email or roll/staff number.',
          });
        }
      }

      const updated = dbService.updateUser(id, updates);
      res.status(200).json(updated);
    } catch (err) {
      if (err?.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          message: 'Another user already uses this email or roll/staff number.',
        });
      }
      next(err);
    }
  },

  // DELETE /api/admin/users/:id
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own active administrator account.',
        });
      }

      const deleted = dbService.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `User with ID ${id} not found.`,
        });
      }

      res.status(200).json({
        success: true,
        id,
        message: 'User deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/admin/users/bulk
  async bulkCreateUsers(req, res, next) {
    try {
      const { users } = req.body;
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Request body must include a non-empty users array.',
        });
      }

      const created = [];
      const errors = [];

      users.forEach((userData, index) => {
        if (!userData?.name || !userData?.email || !userData?.rollNumber || !userData?.role) {
          errors.push({
            index,
            email: userData?.email || '',
            rollNumber: userData?.rollNumber || '',
            message: 'Missing required fields (name, email, rollNumber, role).',
          });
          return;
        }

        const conflict = dbService.findConflictUser({
          email: userData.email,
          rollNumber: userData.rollNumber,
        });
        if (conflict) {
          errors.push({
            index,
            email: userData.email,
            rollNumber: userData.rollNumber,
            message: 'Duplicate email or roll/staff number.',
          });
          return;
        }

        try {
          const user = dbService.createUser(userData);
          created.push(user);
        } catch (err) {
          errors.push({
            index,
            email: userData.email,
            rollNumber: userData.rollNumber,
            message: err.message || 'Failed to create user.',
          });
        }
      });

      const status = created.length > 0 ? 201 : 400;
      res.status(status).json({
        success: created.length > 0,
        createdCount: created.length,
        errorCount: errors.length,
        created,
        errors,
        message:
          created.length > 0
            ? `Created ${created.length} user(s)${errors.length > 0 ? `, ${errors.length} skipped` : ''}.`
            : errors[0]?.message || 'No users could be created.',
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/admin/users/:id/toggle-status
  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const updated = dbService.toggleUserStatus(id);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `User with ID ${id} not found.`,
        });
      }

      const users = dbService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/passes
  async getAllPasses(req, res, next) {
    try {
      const passes = dbService.getAllPasses();
      res.status(200).json(passes);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/reports?days=7
  async getSystemReports(req, res, next) {
    try {
      const days = req.query.days;
      const reports = dbService.getReports(days);
      res.status(200).json(reports);
    } catch (err) {
      next(err);
    }
  },
};
