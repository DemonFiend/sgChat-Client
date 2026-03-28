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

type AuthView = 'loading' | 'server-setup' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'pending-approval' | 'app';

function AuthRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isPendingApproval = useAuthStore((s) => s.isPendingApproval);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [view, setView] = useState<AuthView>('loading');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) {
      setView('loading');
    } else if (isAuthenticated) {
      setView('app');
    } else if (isPendingApproval) {
      setView('pending-approval');
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
