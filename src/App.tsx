import { Router, Route, Navigate, useNavigate } from '@solidjs/router';
import { Show, lazy, Suspense, onMount, onCleanup, createEffect, createSignal, JSX } from 'solid-js';
import { authStore } from '@/stores/auth';
import { networkStore } from '@/stores/network';
import { socketService } from '@/lib/socket';
import { hydrateTheme } from '@/stores/theme';
import { voiceStore } from '@/stores/voice';
import { isTauri } from '@/lib/tauri';
import { SessionExpiredOverlay } from '@/components/ui/SessionExpiredOverlay';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const MainLayout = lazy(() => import('@/layouts/MainLayout').then((m) => ({ default: m.MainLayout })));

function LoadingScreen() {
  return (
    <div class="min-h-screen flex items-center justify-center bg-bg-tertiary">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p class="text-text-muted">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute(props: { children: JSX.Element }) {
  const state = authStore.state;
  return (
    <Show when={!state().isLoading} fallback={<LoadingScreen />}>
      <Show when={state().isAuthenticated} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
}

function PublicRoute(props: { children: JSX.Element }) {
  const state = authStore.state;
  return (
    <Show when={!state().isLoading} fallback={<LoadingScreen />}>
      <Show when={!state().isAuthenticated} fallback={<Navigate href="/channels/@me" />}>
        {props.children}
      </Show>
    </Show>
  );
}

function RootLayout(props: { children?: JSX.Element }) {
  const navigate = useNavigate();
  const [initialized, setInitialized] = createSignal(false);

  onMount(async () => {
    // Hydrate Tauri stores (async — loads from persistent storage)
    await Promise.all([
      networkStore.hydrate(),
      hydrateTheme(),
    ]);

    // Register global shortcuts (Tauri only)
    if (isTauri()) {
      try {
        const { register } = await import('@tauri-apps/plugin-global-shortcut');
        await register('Ctrl+Shift+M', () => {
          // Toggle mute
          voiceStore.setMuted(!voiceStore.isMuted());
        });
        await register('Ctrl+Shift+D', () => {
          // Toggle deafen
          voiceStore.setDeafened(!voiceStore.isDeafened());
        });
      } catch (err) {
        console.warn('[App] Failed to register global shortcuts:', err);
      }
    }

    // Desktop client: if we have a stored last network URL, auto-connect to it
    const lastUrl = networkStore.currentUrl();
    if (lastUrl) {
      await networkStore.testConnection(lastUrl);
    } else {
      // Try the default from env
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        const connected = await networkStore.testConnection(envUrl);
        if (connected) {
          networkStore.addOrUpdateNetwork(envUrl, {
            name: networkStore.serverInfo()?.name || 'sgChat Server',
            isDefault: true,
            lastConnected: new Date().toISOString(),
          });
        }
      }
    }

    // Try normal auth check (refresh token via httpOnly cookie)
    const isAuthenticated = await authStore.checkAuth();

    if (isAuthenticated) {
      setInitialized(true);
      return;
    }

    // If not authenticated and auto-login is enabled with a default network, try auto-login
    if (networkStore.autoLogin() && networkStore.defaultNetwork()) {
      const defaultNet = networkStore.defaultNetwork()!;

      const connected = await networkStore.testConnection(defaultNet.url);

      if (connected) {
        const success = await authStore.attemptAutoLogin();

        if (success) {
          navigate('/channels/@me', { replace: true });
        }
      }
    }

    setInitialized(true);
  });

  // Connect socket when authenticated
  createEffect(() => {
    if (authStore.state().isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  });

  return (
    <Show when={initialized()} fallback={<LoadingScreen />}>
      <Show when={authStore.authError()}>
        <SessionExpiredOverlay />
      </Show>
      <Suspense fallback={<LoadingScreen />}>
        {props.children}
      </Suspense>
    </Show>
  );
}

export function App() {
  return (
    <Router root={RootLayout}>
      <Route path="/login" component={() => (
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      )} />

      <Route path="/register" component={() => (
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      )} />

      <Route path="/forgot-password" component={() => (
        <PublicRoute>
          <ForgotPasswordPage />
        </PublicRoute>
      )} />

      <Route path="/reset-password" component={() => (
        <PublicRoute>
          <ResetPasswordPage />
        </PublicRoute>
      )} />

      <Route path="/channels/@me" component={() => (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      )} />

      <Route path="/channels/:channelId" component={() => (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      )} />

      <Route path="/channels" component={() => (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      )} />

      <Route path="/" component={() => <Navigate href="/channels/@me" />} />
      <Route path="/*" component={() => <Navigate href="/login" />} />
    </Router>
  );
}
