import api, { withMockFallback } from './axios';
import {
  getUserByEmailOrRoll,
  getStoredAuthUser,
  setStoredAuthUser,
  getUsers,
} from '../utils/mockStorage';

export const authApi = {
  async login(emailOrRoll, password, roleHint = null) {
    return withMockFallback(
      async () => {
        const res = await api.post('/auth/login', {
          identifier: emailOrRoll,
          password,
          roleHint,
        });
        setStoredAuthUser(res.data.user);
        localStorage.setItem('gatepass_token', res.data.token);
        return res.data;
      },
      () => {
        let user = emailOrRoll ? getUserByEmailOrRoll(emailOrRoll) : null;
        if (!emailOrRoll && !user && roleHint) {
          const users = getUsers();
          user = users.find((u) => u.role === roleHint && u.active) || users.find((u) => u.role === roleHint);
        }
        if (!user) {
          throw new Error('Invalid credentials or user not found. Please try again.');
        }
        if (!user.active) {
          throw new Error('Your account has been disabled by system administrator.');
        }
        if (password && password !== 'password123') {
          throw new Error('Incorrect password. Please verify your credentials and try again.');
        }
        if (!password && !roleHint) {
          throw new Error('Password is required to sign in.');
        }
        const fakeToken = `mock-jwt-token-${user.id}-${Date.now()}`;
        setStoredAuthUser(user);
        localStorage.setItem('gatepass_token', fakeToken);
        return { success: true, user, token: fakeToken };
      }
    );
  },

  async demoSwitch(role) {
    return withMockFallback(
      async () => {
        const res = await api.post('/auth/demo-switch', { role });
        setStoredAuthUser(res.data.user);
        localStorage.setItem('gatepass_token', res.data.token);
        return res.data;
      },
      () => {
        const users = getUsers();
        const roleUsers = users.filter((u) => u.role === (role || 'student'));
        const user = roleUsers.find((u) => u.active) || roleUsers[0];
        if (!user) {
          throw new Error(`No demo account found for role '${role}'.`);
        }
        if (!user.active) {
          throw new Error(`All '${role}' accounts are currently deactivated.`);
        }
        const fakeToken = `mock-jwt-token-${user.id}-${Date.now()}`;
        setStoredAuthUser(user);
        localStorage.setItem('gatepass_token', fakeToken);
        return { success: true, user, token: fakeToken };
      }
    );
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout network/auth error and always clear local state
    } finally {
      setStoredAuthUser(null);
      localStorage.removeItem('gatepass_token');
    }
  },

  async getCurrentUser() {
    return withMockFallback(
      async () => {
        const res = await api.get('/auth/me');
        const user = res.data?.user || res.data;
        if (user) {
          setStoredAuthUser(user);
        }
        return user;
      },
      () => getStoredAuthUser()
    );
  },
};
