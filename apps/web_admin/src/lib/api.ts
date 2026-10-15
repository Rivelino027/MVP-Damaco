import axios from 'axios';
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
  LoginResponse,
  RefreshResponse,
  User,
} from '@/types';
import { useAuthStore } from '@/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Axios instance utama.
 * Semua request mengirim header X-Client: web.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'web',
  },
  withCredentials: true,
});

// ─── Request interceptor: sertakan Bearer token ───
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Promise level modul untuk pemulihan sesi single-flight ───
let recoveryPromise: Promise<User | null> | null = null;

export function _resetRecoveryPromise(): void {
  recoveryPromise = null;
}

// ─── Response interceptor: refresh otomatis saat 401 ───
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Hanya coba refresh saat 401 dan belum pernah di-retry
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Jangan refresh untuk endpoint login/refresh itu sendiri
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // Jika pemulihan sesi awal sedang berjalan, tunggu hasilnya
    if (recoveryPromise) {
      return recoveryPromise.then((user) => {
        if (!user) {
          return Promise.reject(error);
        }
        const newToken = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    if (isRefreshing) {
      // Antrekan request paralel
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = sessionStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const { data } = await axios.post<RefreshResponse>(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json', 'X-Client': 'web' } },
      );

      // Simpan token baru
      useAuthStore.getState().setAccessToken(data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);

      processQueue(null, data.accessToken);

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh gagal: logout
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── API functions ───
export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function logoutApi(): Promise<void> {
  const refreshToken = sessionStorage.getItem('refreshToken');
  try {
    await api.post('/auth/logout', { refreshToken });
  } catch {
    // Logout boleh gagal jika token sudah expired
  }
}

export async function getMeApi(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  const { data } = await api.post<ChangePasswordResponse>('/auth/change-password', payload);
  return data;
}

/**
 * Pemulihan sesi saat aplikasi pertama kali dimuat (F5 / ketik URL).
 * Single-flight: promise disimpan di level modul agar pemanggilan ganda
 * (misal React StrictMode atau request paralel) hanya memicu 1 kali POST /auth/refresh.
 */
export async function recoverSession(): Promise<User | null> {
  // Jika sudah ada user dan access token di memori, kembalikan user saat ini
  const state = useAuthStore.getState();
  if (state.isAuthenticated && state.accessToken && state.user) {
    return state.user;
  }

  // Jika sedang dalam proses pemulihan, pakai bersama promise yang sama (single-flight)
  if (recoveryPromise) {
    return recoveryPromise;
  }

  const refreshToken = typeof window !== 'undefined' ? sessionStorage.getItem('refreshToken') : null;
  if (!refreshToken) {
    return null;
  }

  recoveryPromise = (async () => {
    try {
      // 1. Panggil POST /auth/refresh
      const { data } = await axios.post<RefreshResponse>(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json', 'X-Client': 'web' } },
      );

      // Simpan refresh token baru (karena dirotasi) dan access token baru di memori
      sessionStorage.setItem('refreshToken', data.refreshToken);
      useAuthStore.getState().setAccessToken(data.accessToken);

      // 2. Ambil profil diri GET /auth/me dengan token baru
      const { data: userData } = await axios.get<User>(`${API_URL}/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'web',
          Authorization: `Bearer ${data.accessToken}`,
        },
      });

      // 3. Simpan data sesi lengkap di auth store
      useAuthStore.getState().setAuth(data.accessToken, userData);
      return userData;
    } catch (error) {
      // Jika refresh atau /auth/me gagal, hapus sesi
      useAuthStore.getState().logout();
      throw error;
    } finally {
      recoveryPromise = null;
    }
  })();

  return recoveryPromise;
}
