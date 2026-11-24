import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { getStoredAuthUser, setStoredAuthUser } from '../utils/mockStorage';
import { AuthContext } from './authContextInstance';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      try {
        const stored = getStoredAuthUser();
        const token = localStorage.getItem('gatepass_token');

        if (stored && token) {
          if (active) setCurrentUser(stored);
        } else if (token) {
          const me = await authApi.getCurrentUser();
          if (active && me) setCurrentUser(me);
        } else if (stored) {
          // Legacy stored user without token: keep clean unauthenticated state
          setStoredAuthUser(null);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (active) setCurrentUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    initAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (emailOrRoll, password, roleHint = null) => {
    setLoading(true);
    try {
      const res = await authApi.login(emailOrRoll, password, roleHint);
      setCurrentUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setCurrentUser(null);
  }, []);

  const switchRole = useCallback(async (role) => {
    const res = await authApi.demoSwitch(role);
    if (res?.user) {
      setCurrentUser(res.user);
    }
    return res;
  }, []);

  const updateUser = useCallback((updatedFields) => {
    if (!updatedFields) return;
    setCurrentUser((prev) => {
      const next = prev ? { ...prev, ...updatedFields } : updatedFields;
      setStoredAuthUser(next);
      return next;
    });
  }, []);

  const value = {
    currentUser,
    role: currentUser?.role || null,
    isAuthenticated: !!currentUser,
    loading,
    login,
    logout,
    switchRole,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
