import api, { withMockFallback } from './axios';
import {
  getGatePasses,
  getGatePassById,
  createGatePassRequest,
  cancelGatePass,
  updateStudentProfile,
} from '../utils/mockStorage';

export const studentApi = {
  async getMyRequests(studentId) {
    return withMockFallback(
      async () => {
        const res = await api.get(`/student/requests?studentId=${encodeURIComponent(studentId || '')}`);
        return res.data;
      },
      () => {
        const passes = getGatePasses();
        return passes.filter((p) => p.studentId === studentId);
      }
    );
  },

  async createRequest(passData, studentUser) {
    return withMockFallback(
      async () => {
        const res = await api.post('/student/requests', { ...passData, studentUser });
        return res.data;
      },
      () => createGatePassRequest(passData, studentUser)
    );
  },

  async getPassDetails(passId) {
    return withMockFallback(
      async () => {
        const res = await api.get(`/student/requests/${encodeURIComponent(passId)}`);
        return res.data;
      },
      () => getGatePassById(passId)
    );
  },

  async cancelRequest(passId) {
    return withMockFallback(
      async () => {
        const res = await api.post(`/student/requests/${encodeURIComponent(passId)}/cancel`);
        return res.data;
      },
      () => cancelGatePass(passId)
    );
  },

  async updateProfile(userId, profileData) {
    return withMockFallback(
      async () => {
        const res = await api.put(`/student/profile/${encodeURIComponent(userId)}`, profileData);
        return res.data;
      },
      () => updateStudentProfile(userId, profileData)
    );
  },
};
