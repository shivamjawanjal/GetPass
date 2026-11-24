import { dbService } from '../config/db.js';

export const clerkController = {
  // GET /api/clerk/requests
  async getAllRequests(req, res, next) {
    try {
      const { status } = req.query;
      let passes = dbService.getAllPasses();

      if (status) {
        passes = passes.filter((p) => p.status.toLowerCase() === status.toLowerCase());
      }

      res.status(200).json(passes);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/clerk/requests/pending
  async getPendingRequests(req, res, next) {
    try {
      const pending = dbService.getPendingPasses();
      res.status(200).json(pending);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/clerk/requests/:id
  async getRequestDetails(req, res, next) {
    try {
      const { id } = req.params;
      const pass = dbService.getPassById(id);

      if (!pass) {
        return res.status(404).json({
          success: false,
          message: `Gate Pass with ID ${id} not found.`,
        });
      }

      res.status(200).json(pass);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/clerk/requests/:id/approve
  async approveRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { clerkRemarks, clerkUser } = req.body;

      const pass = dbService.getPassById(id);
      if (!pass) {
        return res.status(404).json({
          success: false,
          message: `Gate Pass with ID ${id} not found.`,
        });
      }

      if (pass.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve pass with status '${pass.status}'. Only pending requests can be approved.`,
        });
      }

      const clerkName =
        (req.user ? `${req.user.name} (${req.user.role})` : null) ||
        (clerkUser ? `${clerkUser.name} (Clerk)` : null) ||
        'Staff Clerk (Administration)';

      const approved = dbService.approvePass(id, clerkName, clerkRemarks || 'Approved via Portal');
      res.status(200).json(approved);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/clerk/requests/:id/reject
  async rejectRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason, clerkUser } = req.body;

      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A clear reason for rejection must be provided.',
        });
      }

      const pass = dbService.getPassById(id);
      if (!pass) {
        return res.status(404).json({
          success: false,
          message: `Gate Pass with ID ${id} not found.`,
        });
      }

      if (pass.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot reject pass with status '${pass.status}'. Only pending requests can be rejected.`,
        });
      }

      const clerkName =
        (req.user ? `${req.user.name} (${req.user.role})` : null) ||
        (clerkUser ? `${clerkUser.name} (Clerk)` : null) ||
        'Staff Clerk (Administration)';

      const rejected = dbService.rejectPass(id, clerkName, rejectionReason.trim());
      res.status(200).json(rejected);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/clerk/requests/bulk
  async bulkAction(req, res, next) {
    try {
      const { ids, action, remarks, clerkRemarks, rejectionReason, clerkUser } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one gate pass ID must be selected.',
        });
      }

      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({
          success: false,
          message: "Bulk action must be either 'approve' or 'reject'.",
        });
      }

      if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({
          success: false,
          message: 'A rejection reason is required for bulk reject.',
        });
      }

      const clerkName =
        (req.user ? `${req.user.name} (${req.user.role})` : null) ||
        (clerkUser ? `${clerkUser.name} (Clerk)` : null) ||
        'Staff Clerk (Administration)';

      const updated = [];
      const skipped = [];

      for (const id of ids) {
        const pass = dbService.getPassById(id);
        if (!pass) {
          skipped.push({ id, reason: 'Not found' });
          continue;
        }
        if (pass.status !== 'pending') {
          skipped.push({ id, reason: `Status is '${pass.status}', expected 'pending'` });
          continue;
        }

        if (action === 'approve') {
          const result = dbService.approvePass(
            id,
            clerkName,
            remarks ?? clerkRemarks ?? 'Approved via Bulk Action'
          );
          updated.push(result);
        } else {
          const result = dbService.rejectPass(id, clerkName, rejectionReason.trim());
          updated.push(result);
        }
      }

      res.status(200).json({
        success: true,
        updatedCount: updated.length,
        skippedCount: skipped.length,
        updated,
        skipped,
      });
    } catch (err) {
      next(err);
    }
  },
};
