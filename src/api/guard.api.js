import api, { withMockFallback } from './axios';
import {
  getGatePassByToken,
  markGatePassUsed,
  getScanLogs,
  addScanLog,
  lookupGatePasses,
  checkInGatePass,
} from '../utils/mockStorage';
import { PASS_STATUS } from '../utils/constants';

export const guardApi = {
  async verifyGatePassToken(token, guardUser, gate) {
    const selectedGate = gate || guardUser?.gate || 'Main Gate';
    return withMockFallback(
      async () => {
        const res = await api.post('/gate-passes/verify', {
          token,
          guardId: guardUser?.id,
          guardUser,
          gate: selectedGate,
        });
        return res.data;
      },
      () => {
        let pass = getGatePassByToken(token?.trim());
        let isValid = false;
        let reason = 'Invalid Token';

        if (!pass) {
          reason = 'Pass Not Found / Invalid QR Token';
        } else if (pass.status === PASS_STATUS.REJECTED) {
          reason = 'Pass Was Rejected by Clerk';
        } else if (pass.status === PASS_STATUS.CANCELLED) {
          reason = 'Pass Was Cancelled by Student';
        } else if (pass.status === PASS_STATUS.EXPIRED) {
          reason = 'Pass Has Expired';
        } else if (pass.status === PASS_STATUS.USED) {
          reason = 'Pass Already Used for Exit';
        } else if (pass.status === PASS_STATUS.PENDING) {
          reason = 'Pass Still Awaiting Clerk Approval';
        } else if (pass.status === PASS_STATUS.APPROVED) {
          if (pass.validUntil && new Date(pass.validUntil).getTime() < Date.now()) {
            reason = 'Pass Validity Window Expired';
          } else {
            isValid = true;
            pass = markGatePassUsed(pass.id) || pass;
          }
        }

        const log = addScanLog({
          passId: pass ? pass.id : 'N/A',
          studentName: pass ? pass.studentName : 'Unknown',
          rollNumber: pass ? pass.rollNumber : 'UNKNOWN',
          guardName: guardUser?.name || 'Gate Security',
          gate: selectedGate,
          result: isValid ? 'VALID' : 'INVALID',
          scanType: 'exit',
          notes: isValid ? 'Gate Exit Verified & Allowed' : reason,
        });

        return {
          isValid,
          reason: isValid ? null : reason,
          pass: pass || null,
          log,
        };
      }
    );
  },

  async lookupPass(query = '') {
    return withMockFallback(
      async () => {
        const res = await api.get(`/guard/lookup?q=${encodeURIComponent(query)}`);
        return res.data;
      },
      () => lookupGatePasses(query)
    );
  },

  async checkIn(payload) {
    return withMockFallback(
      async () => {
        const res = await api.post('/guard/check-in', payload);
        return res.data;
      },
      () => checkInGatePass(payload)
    );
  },

  async getScanHistory() {
    return withMockFallback(
      async () => {
        const res = await api.get('/guard/scans');
        return res.data;
      },
      () => getScanLogs()
    );
  },
};
