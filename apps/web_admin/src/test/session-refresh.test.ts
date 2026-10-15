import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

describe('Penanganan Sesi & Interceptor Refresh Token', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('menyimpan access token di memori Zustand dan TIDAK di localStorage', () => {
    useAuthStore.getState().setAuth('access-token-123', {
      id: 'usr-1',
      name: 'User 1',
      email: 'user1@test.com',
      role: 'admin',
      departmentId: null,
      jobTitle: null,
      avatarUrl: null,
      mustChangePassword: false,
      lastLoginAt: null,
    });

    expect(useAuthStore.getState().accessToken).toBe('access-token-123');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('menyimpan refresh token di sessionStorage', () => {
    sessionStorage.setItem('refreshToken', 'refresh-token-xyz');
    expect(sessionStorage.getItem('refreshToken')).toBe('refresh-token-xyz');
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('mengirim header X-Client: web dan Authorization Bearer pada setiap request', async () => {
    useAuthStore.getState().setAccessToken('my-test-access-token');

    let capturedConfig: AxiosRequestConfig | undefined;
    vi.spyOn(api, 'get').mockImplementation(async (_url, config) => {
      // Mock call to simulate request interceptor
      capturedConfig = {
        ...config,
        headers: {
          'X-Client': 'web',
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        } as never,
      };
      return { data: { ok: true }, status: 200 } as never;
    });

    await api.get('/test-endpoint');

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig?.headers?.['X-Client']).toBe('web');
    expect(capturedConfig?.headers?.['Authorization']).toBe('Bearer my-test-access-token');
  });

  it('interceptor refresh otomatis memperbarui token saat 401 dan me-retry request', async () => {
    useAuthStore.getState().setAccessToken('old-expired-token');
    sessionStorage.setItem('refreshToken', 'valid-refresh-token');

    // Spy on axios.post for refresh
    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        accessToken: 'new-fresh-token',
        refreshToken: 'new-rotated-refresh-token',
      },
    });

    // Mock first call failing with 401, then retry succeeding
    let attempts = 0;
    const adapter = vi.fn().mockImplementation(async (config: AxiosRequestConfig) => {
      attempts++;
      if (attempts === 1) {
        const error = Object.assign(new Error('Request failed with status code 401'), {
          response: {
            status: 401,
            data: { message: 'Unauthorized' },
            config,
          },
          config,
        });
        throw error;
      }
      return {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    api.defaults.adapter = adapter;

    const res = await api.get('/protected-resource');

    expect(res.data).toEqual({ success: true });
    expect(axiosPostSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('new-fresh-token');
    expect(sessionStorage.getItem('refreshToken')).toBe('new-rotated-refresh-token');
  });

  it('melakukan logout otomatis jika refresh token gagal saat 401', async () => {
    useAuthStore.getState().setAuth('expired-token', {
      id: 'usr-1',
      name: 'User',
      email: 'user@test.com',
      role: 'admin',
      departmentId: null,
      jobTitle: null,
      avatarUrl: null,
      mustChangePassword: false,
      lastLoginAt: null,
    });
    sessionStorage.setItem('refreshToken', 'invalid-refresh-token');

    // Mock axios.post refresh failure
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Refresh token invalid'));

    const adapter = vi.fn().mockImplementation(async (config: AxiosRequestConfig) => {
      const error = Object.assign(new Error('Request failed with status code 401'), {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
          config,
        },
        config,
      });
      throw error;
    });

    api.defaults.adapter = adapter;

    await expect(api.get('/protected-resource')).rejects.toThrow();

    // Pastikan auth store dibersihkan dan sessionStorage dihapus
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
  });
});
