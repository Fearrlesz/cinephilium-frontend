// ============================================================
// API CLIENT
// ============================================================

import axios from 'axios';

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://cinephilium-backend.onrender.com/api';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const AUTH_LOGOUT_EVENT = 'auth:logout';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  // нужно, чтобы браузер отправлял HttpOnly refresh-cookie
  withCredentials: true
});

// Отдельный клиент для обновления токена: без интерсепторов, чтобы не зациклиться.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true
});

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('token');
}

export function setAccessToken(token) {
  if (!token) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  // Совместимость: часть старых компонентов проверяет именно ключ 'token'.
  localStorage.setItem('token', token);
}

// Завершает сессию и на сервере (отзывает refresh-сессию), и на клиенте.
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* сеть или уже невалидная сессия — всё равно чистим локально */
  }
  clearSession();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  // старый ключ v2 больше не используется
  localStorage.removeItem('token');
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

function redirectToLogin() {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

let refreshPromise = null;

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then(response => {
        const token = response.data?.accessToken;
        if (!token) throw new Error('Сервер не вернул accessToken');
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const AUTH_FLOW = /^\/auth\/(login|register|refresh|verify-email|resend-verification|forgot-password|reset-password|logout)/;

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const data = error.response?.data;

    // Бэкенд отдаёт { error: { code, message, details } }, а старый UI ждёт строку.
    // Нормализуем здесь, чтобы не править десятки мест в компонентах.
    if (data && typeof data === 'object' && data.error && typeof data.error === 'object') {
      data.errorDetails = data.error.details;
      data.error = data.error.message || 'Ошибка';
    }

    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';
    const isAuthFlow = AUTH_FLOW.test(url);

    if (status === 401 && !original._retried && !isAuthFlow) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        if (original.headers && typeof original.headers.set === 'function') {
          original.headers.set('Authorization', `Bearer ${token}`);
        } else {
          original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
        }
        return api(original);
      } catch {
        clearSession();
        redirectToLogin();
      }
    } else if (status === 401 && !isAuthFlow) {
      clearSession();
    }

    return Promise.reject(error);
  }
);

export default api;
