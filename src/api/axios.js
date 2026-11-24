import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export function isNetworkError(error) {
  return !error?.response;
}

export function normalizeApiError(error) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.reason ||
    error?.message ||
    'Request failed';
  const normalized = new Error(message);
  normalized.status = error?.response?.status;
  normalized.response = error?.response;
  normalized.data = error?.response?.data;
  return normalized;
}

export async function withMockFallback(requestFn, fallbackFn) {
  try {
    return await requestFn();
  } catch (err) {
    if (isNetworkError(err)) {
      return fallbackFn();
    }
    throw normalizeApiError(err);
  }
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gatepass_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('gatepass_current_user_v1');
      localStorage.removeItem('gatepass_token');
    }

    if (isNetworkError(error)) {
      console.warn('API unreachable, falling back to local mock storage:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
