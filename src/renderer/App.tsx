import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/authStore';
import { ServerSetupPage } from './pages/ServerSetupPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AppLayout } from './layouts/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SessionExpiredOverlay } from './components/ui/SessionExpiredOverlay';
import { NotificationToast } from './components/ui/NotificationToast';

type AuthView = 'loading' | 'server-setup' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'app';

function AuthRouter() {
  const { isAuthenticated, isLoading, serverUrl, checkAuth } = useAuthStore();
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
    } else if (!serverUrl) {
      setView('server-setup');
    } else {
      setView('login');
    }
  }, [isLoading, isAuthenticated, serverUrl]);

  if (view === 'loading') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32 }} />
        <Stack align="center" gap="md">
          <Loader color="brand" size="lg" />
          <Text c="dimmed" size="sm">Loading...</Text>
        </Stack>
      </Center>
    );
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
