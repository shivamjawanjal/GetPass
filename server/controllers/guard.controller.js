import { dbService } from '../config/db.js';

export const guardController = {
  // POST /api/guard/verify or /api/gate-passes/verify
  async verifyGatePassToken(req, res, next) {
    try {
      const { token, guardId, guardUser, gate: customGate } = req.body;

      if (!token) {
        return res.status(400).json({
          isValid: false,
          reason: 'QR Token string is required for verification.',
          pass: null,
          log: null,
        });
      }

      const guard =
        req.user ||
        guardUser ||
        (guardId ? dbService.getUserById(guardId) : null) ||
        dbService.getUsersByRole('guard')[0];

      const gateName = customGate || guard?.gate || 'Main Campus Gate 1';
      const guardDisplayName = guard?.name || 'Gate Security Personnel';

      let pass = dbService.getPassByToken(token.trim());
      let isValid = false;
      let reason = 'Invalid Token';

      if (!pass) {
        reason = 'Pass Not Found / Invalid QR Token';
      } else if (pass.status === 'rejected') {
        reason = 'Pass Was Rejected by Clerk: ' + (pass.rejectionReason || 'No reason provided');
      } else if (pass.status === 'cancelled') {
        reason = 'Pass Was Cancelled by Student';
      } else if (pass.status === 'expired') {
        reason = 'Pass Has Expired';
      } else if (pass.status === 'used') {
        reason = 'Pass Already Used for Exit';
      } else if (pass.status === 'pending') {
        reason = 'Pass Still Awaiting Clerk Approval (Not Valid for Exit)';
      } else if (pass.status === 'approved') {
        if (pass.validUntil && new Date(pass.validUntil).getTime() < Date.now()) {
          reason = 'Pass Validity Window Expired';
        } else {
          isValid = true;
          reason = null;
          pass = dbService.markPassUsed(pass.id);
        }
      }

      const log = dbService.createScanLog({
        passId: pass ? pass.id : 'N/A',
        studentName: pass ? pass.studentName : 'Unknown / Unregistered',
        rollNumber: pass ? pass.rollNumber : 'UNKNOWN',
        guardName: guardDisplayName,
        gate: gateName,
        result: isValid ? 'VALID' : 'INVALID',
        scanType: 'exit',
        notes: isValid ? 'Departure Authorized: Gate Exit Recorded' : reason,
      });

      res.status(200).json({
        isValid,
        reason,
        pass: pass || null,
        log,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/guard/lookup?q=
  async lookupPasses(req, res, next) {
    try {
      const { q } = req.query;
      const passes = dbService.lookupPasses(q);
      res.status(200).json(passes);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/guard/check-in
  async checkInPass(req, res, next) {
    try {
      const { passId, token, gate: customGate, guardId, guardUser, notes } = req.body;

      if (!passId && !token) {
        return res.status(400).json({
          success: false,
          message: 'Pass ID or QR token is required for return check-in.',
        });
      }

      let pass = passId ? dbService.getPassById(String(passId).trim()) : null;
      if (!pass && token) {
        pass = dbService.getPassByToken(String(token).trim());
      }

      if (!pass) {
        return res.status(404).json({
          success: false,
          message: 'Gate pass not found.',
        });
      }

      if (pass.returnedAt) {
        return res.status(400).json({
          success: false,
          message: 'Student return check-in has already been recorded for this pass.',
        });
      }

      if (pass.status !== 'used') {
        return res.status(400).json({
          success: false,
          message: `Cannot record return check-in for a pass with status '${pass.status}'. Only exited ('used') passes can be checked in.`,
        });
      }

      const guard =
        req.user ||
        guardUser ||
        (guardId ? dbService.getUserById(guardId) : null) ||
        dbService.getUsersByRole('guard')[0];

      const gateName = customGate || guard?.gate || 'Main Campus Gate 1';
      const guardDisplayName = guard?.name || 'Gate Security Personnel';
      const returnedAt = new Date().toISOString();
      const overdue = Boolean(pass.validUntil && new Date(pass.validUntil).getTime() < Date.now());

      const updatedPass = dbService.recordPassCheckIn(pass.id, returnedAt);
      const logNotes =
        notes ||
        (overdue
          ? 'Return Check-In Recorded (Late / Overdue)'
          : 'Return Check-In Recorded: Student Returned to Campus');

      const log = dbService.createScanLog({
        passId: updatedPass.id,
        studentName: updatedPass.studentName,
        rollNumber: updatedPass.rollNumber,
        guardName: guardDisplayName,
        gate: gateName,
        result: 'VALID',
        scanType: 'entry',
        notes: logNotes,
      });

      res.status(200).json({
        success: true,
        isValid: true,
        overdue,
        pass: updatedPass,
        log,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/guard/scans
  async getScanHistory(req, res, next) {
    try {
      const scans = dbService.getAllScanLogs();
      res.status(200).json(scans);
    } catch (err) {
      next(err);
    }
  },
};
