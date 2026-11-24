import api, { withMockFallback } from './axios';
import {
  getGatePasses,
  getGatePassById,
  approveGatePass,
  rejectGatePass,
  bulkGatePassAction,
} from '../utils/mockStorage';
import { PASS_STATUS } from '../utils/constants';

export const clerkApi = {
  async getAllRequests() {
    return withMockFallback(
      async () => {
        const res = await api.get('/clerk/requests');
        return res.data;
      },
      () => getGatePasses()
    );
  },

  async getRequestsByStatus(status) {
    return withMockFallback(
      async () => {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        const res = await api.get(`/clerk/requests${query}`);
        return res.data;
      },
      () => {
        const passes = getGatePasses();
        if (!status) return passes;
        return passes.filter((p) => p.status?.toLowerCase() === status.toLowerCase());
      }
    );
  },

  async getPendingRequests() {
    return withMockFallback(
      async () => {
        const res = await api.get('/clerk/requests/pending');
        return res.data;
      },
      () => {
        const passes = getGatePasses();
        return passes.filter((p) => p.status === PASS_STATUS.PENDING);
      }
    );
  },

  async getRequestDetails(id) {
    return withMockFallback(
      async () => {
        const res = await api.get(`/clerk/requests/${encodeURIComponent(id)}`);
        return res.data;
      },
      () => getGatePassById(id)
    );
  },

  async approveRequest(id, clerkUser, clerkRemarks) {
    return withMockFallback(
      async () => {
        const res = await api.post(`/clerk/requests/${encodeURIComponent(id)}/approve`, {
          clerkRemarks,
          clerkUser,
        });
        return res.data;
      },
      () => approveGatePass(id, clerkUser, clerkRemarks)
    );
  },

  async rejectRequest(id, clerkUser, rejectionReason) {
    return withMockFallback(
      async () => {
        const res = await api.post(`/clerk/requests/${encodeURIComponent(id)}/reject`, {
          rejectionReason,
          clerkUser,
        });
        return res.data;
      },
      () => rejectGatePass(id, clerkUser, rejectionReason)
    );
  },

  async bulkAction(payload) {
    return withMockFallback(
      async () => {
        const res = await api.post('/clerk/requests/bulk', payload);
        return res.data;
      },
      () => bulkGatePassAction(payload)
    );
  },
};
