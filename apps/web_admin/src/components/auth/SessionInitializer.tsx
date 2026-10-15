import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth';
import { recoverSession } from '@/lib/api';
import { LoadingState } from '@/components/shared';

interface SessionInitializerProps {
  children: ReactNode;
}

export function SessionInitializer({ children }: SessionInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(() => {
    const hasRefreshToken =
      typeof window !== 'undefined' && !!sessionStorage.getItem('refreshToken');
    const isAuth = useAuthStore.getState().isAuthenticated;
    return hasRefreshToken && !isAuth;
  });

  useEffect(() => {
    const hasRefreshToken =
      typeof window !== 'undefined' && !!sessionStorage.getItem('refreshToken');
    const isAuth = useAuthStore.getState().isAuthenticated;

    if (!hasRefreshToken || isAuth) {
      return;
    }

    let isMounted = true;
    recoverSession()
      .catch(() => {
        // Error telah ditangani di dalam recoverSession (logout & pembersihan sesi)
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <LoadingState message="Memulihkan sesi..." />
      </div>
    );
  }

  return <>{children}</>;
}
