import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/authStore';
import { ServerSetupPage } from './pages/ServerSetupPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { AppLayout } from './layouts/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SessionExpiredOverlay } from './components/ui/SessionExpiredOverlay';
import { NotificationToast } from './components/ui/NotificationToast';
import { RuntimeErrorOverlay } from './components/ui/RuntimeErrorOverlay';
import { ScreenSharePicker } from './components/ui/ScreenSharePicker';
import { UpdateModal } from './components/ui/UpdateModal';
import { LayoutSkeleton } from './components/ui/LayoutSkeleton';
import { ImpersonationBanner } from './components/ui/ImpersonationBanner';
import { useE2EStore } from './stores/e2eStore';

type AuthView = 'loading' | 'server-setup' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'pending-approval' | 'app';

const electronAPI = (window as any).electronAPI;

function AuthRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isPendingApproval = useAuthStore((s) => s.isPendingApproval);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);
  const [view, setView] = useState<AuthView>('loading');
  const [resetToken, setResetToken] = useState('');

  // Auto-connect to favorite server on startup, then check auth.
  // After a Quick Connect switch + reload, skip the favorite to respect the user's choice.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const skipFavorite = await electronAPI.servers.shouldSkipFavorite();
        if (cancelled) return;
        if (!skipFavorite) {
          const favoriteUrl = await electronAPI.servers.getFavorite();
          if (cancelled) return;
          if (favoriteUrl) {
            const savedServers = await electronAPI.servers.getSaved();
            if (cancelled) return;
            const hasCreds = savedServers.some((s: any) => s.url === favoriteUrl);
            if (hasCreds) {
              const result = await electronAPI.servers.switch(favoriteUrl);
              if (cancelled) return;
              if (result) {
                setServerUrl(favoriteUrl);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[AuthRouter] Auto-connect failed:', err);
      }
      if (!cancelled) checkAuth();
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize E2E encryption when authenticated
  const e2eInit = useE2EStore((s) => s.init);
  const e2eUploadKeys = useE2EStore((s) => s.uploadKeyBundle);
  const e2eReplenish = useE2EStore((s) => s.replenishOTPKeys);
  useEffect(() => {
    if (isAuthenticated) {
      e2eInit().then(() => {
        e2eUploadKeys().catch(() => {});
        e2eReplenish().catch(() => {});
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) {
      setView('loading');
    } else if (isPendingApproval) {
      setView('pending-approval');
    } else if (isAuthenticated) {
      setView('app');
    } else if (!serverUrl) {
      setView('server-setup');
    } else {
      setView('login');
    }
  }, [isLoading, isAuthenticated, isPendingApproval, serverUrl]);

  if (view === 'loading') {
    return <LayoutSkeleton />;
  }

  if (view === 'server-setup') {
    return <ServerSetupPage onComplete={() => setView('login')} />;
  }

  if (view === 'login') {
    return (
      <LoginPage
        onSwitchToRegister={() => setView('register')}
        onForgotPassword={() => setView('forgot-password')}
        onBack={() => setView('server-setup')}
      />
    );
  }

  if (view === 'register') {
    return <RegisterPage onSwitchToLogin={() => setView('login')} />;
  }

  if (view === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => setView('login')} />;
  }

  if (view === 'pending-approval') {
    return <PendingApprovalPage onBack={() => setView('login')} />;
  }

  if (view === 'reset-password') {
    return <ResetPasswordPage token={resetToken} onBack={() => setView('login')} />;
  }

  return <AppLayout />;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthRouter />
        <SessionExpiredOverlay />
        <NotificationToast />
        <RuntimeErrorOverlay />
        <ScreenSharePicker />
        <UpdateModal />
        <ImpersonationBanner />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
