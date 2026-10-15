import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  /** Access token disimpan di memori (BUKAN localStorage) */
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;

  setAuth: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  setMustChangePassword: (must: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  mustChangePassword: false,

  setAuth: (token, user) =>
    set({
      accessToken: token,
      user,
      isAuthenticated: true,
      mustChangePassword: user.mustChangePassword,
    }),

  setAccessToken: (token) =>
    set({ accessToken: token }),

  setMustChangePassword: (must) =>
    set({ mustChangePassword: must }),

  logout: () => {
    // Hapus refresh token dari sessionStorage saat logout
    sessionStorage.removeItem('refreshToken');
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,
    });
  },
}));
