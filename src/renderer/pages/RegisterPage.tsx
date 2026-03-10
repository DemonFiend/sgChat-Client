import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const serverUrl = useAuthStore((s) => s.serverUrl);

  const handleRegister = async () => {
    setError('');
    if (!username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(serverUrl, username, email, password);
      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.dragRegion} />
      <div style={styles.card}>
        <h1 style={styles.logo}>sgChat</h1>
        <h2 style={styles.title}>Create an account</h2>
        <p style={styles.subtitle}>Join the conversation</p>

        <label style={styles.label}>Username</label>
        <input
          type="text"
          name="username"
          autoComplete="username"
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label style={{ ...styles.label, marginTop: '1rem' }}>Email</label>
        <input
          type="email"
          name="email"
          autoComplete="email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label style={{ ...styles.label, marginTop: '1rem' }}>Password</label>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <span style={styles.link} onClick={onSwitchToLogin}>Log in</span>
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
