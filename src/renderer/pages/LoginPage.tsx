import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const electronAPI = (window as any).electronAPI;

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onBack: () => void;
}

export function LoginPage({ onSwitchToRegister, onForgotPassword, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const serverUrl = useAuthStore((s) => s.serverUrl);

  // Load remembered email on mount
  useEffect(() => {
    electronAPI.config.getRememberedEmail().then((saved: string) => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(serverUrl, email, password);
      if (result.success) {
        electronAPI.config.setRememberedEmail(rememberMe ? email : '');
        if (rememberMe) {
          electronAPI.servers.saveCurrentSession();
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.dragRegion} />
      <div style={styles.card}>
        <h1 style={styles.logo}>sgChat</h1>
        <h2 style={styles.title}>Welcome back!</h2>
        <p style={styles.subtitle}>We're so excited to see you again!</p>

        <label style={styles.label}>Email</label>
        <input
          type="email"
          name="email"
          autoComplete="email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoFocus
        />

        <label style={{ ...styles.label, marginTop: '1rem' }}>Password</label>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={styles.checkbox}
          />
          <span style={styles.checkboxLabel}>Remember me</span>
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p style={styles.switchText}>
          <span style={styles.link} onClick={onForgotPassword}>Forgot your password?</span>
        </p>
        <p style={styles.switchText}>
          Need an account?{' '}
          <span style={styles.link} onClick={onSwitchToRegister}>Register</span>
        </p>
        <p style={styles.switchText}>
          <span style={styles.link} onClick={onBack}>Change server</span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
  },
  dragRegion: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    WebkitAppRegion: 'drag' as any,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: '0 2rem',
    textAlign: 'center' as const,
  },
  logo: {
    color: 'var(--accent)',
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginBottom: '0.5rem',
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    textAlign: 'left' as const,
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderRadius: 8,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
    textAlign: 'left' as const,
  },
  btn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 8,
    background: 'var(--accent)',
    color: 'var(--accent-text)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '1.25rem',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  switchText: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
  },
  link: {
    color: 'var(--accent)',
    cursor: 'pointer',
    fontWeight: 500,
  },
};
