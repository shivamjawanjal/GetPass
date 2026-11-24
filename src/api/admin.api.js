import api, { withMockFallback } from './axios';
import {
  getUsers,
  addUser,
  updateUserInStorage,
  deleteUserInStorage,
  bulkCreateUsersInStorage,
  toggleUserStatus,
  getGatePasses,
  getScanLogs,
  getMockReports,
} from '../utils/mockStorage';

export const adminApi = {
  async getDashboardStats() {
    return withMockFallback(
      async () => {
        const res = await api.get('/admin/stats');
        return res.data;
      },
      () => {
        const users = getUsers();
        const passes = getGatePasses();
        const scans = getScanLogs();

        return {
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
      }
    );
  },

  async getUsersByRole(role) {
    return withMockFallback(
      async () => {
        const query = role ? `?role=${encodeURIComponent(role)}` : '';
        const res = await api.get(`/admin/users${query}`);
        return res.data;
      },
      () => {
        const users = getUsers();
        return role ? users.filter((u) => u.role === role) : users;
      }
    );
  },

  async createUser(userData) {
    return withMockFallback(
      async () => {
        const res = await api.post('/admin/users', userData);
        return res.data;
      },
      () => addUser(userData)
    );
  },

  async updateUser(id, payload) {
    return withMockFallback(
      async () => {
        const res = await api.put(`/admin/users/${encodeURIComponent(id)}`, payload);
        return res.data;
      },
      () => updateUserInStorage(id, payload)
    );
  },

  async deleteUser(id) {
    return withMockFallback(
      async () => {
        const res = await api.delete(`/admin/users/${encodeURIComponent(id)}`);
        return res.data;
      },
      () => deleteUserInStorage(id)
    );
  },

  async bulkCreateUsers(users) {
    return withMockFallback(
      async () => {
        const res = await api.post('/admin/users/bulk', { users });
        return res.data;
      },
      () => bulkCreateUsersInStorage(users)
    );
  },

  async toggleStatus(id) {
    return withMockFallback(
      async () => {
        const res = await api.patch(`/admin/users/${encodeURIComponent(id)}/toggle-status`);
        return res.data;
      },
      () => toggleUserStatus(id)
    );
  },

  async getAllPasses() {
    return withMockFallback(
      async () => {
        const res = await api.get('/admin/passes');
        return res.data;
      },
      () => getGatePasses()
    );
  },

  async getReports(days = 7) {
    return withMockFallback(
      async () => {
        const res = await api.get(`/admin/reports?days=${encodeURIComponent(days)}`);
        return res.data;
      },
      () => getMockReports(days)
    );
  },

  async getSystemReports(days = 7) {
    return this.getReports(days);
  },
};
