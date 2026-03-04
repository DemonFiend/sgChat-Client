import { useState } from 'react';
import { api } from '../lib/api';

interface ResetPasswordPageProps {
  token: string;
  onBack: () => void;
}

export function ResetPasswordPage({ token, onBack }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.dragRegion} />
        <div style={styles.card}>
          <h1 style={styles.title}>Password reset!</h1>
          <p style={styles.subtitle}>
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <button style={styles.btn} onClick={onBack}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dragRegion} />
      <div style={styles.card}>
        <h1 style={styles.title}>Reset your password</h1>
        <p style={styles.subtitle}>
          Enter a new password for your account.
        </p>

        <label style={styles.label}>New Password</label>
        <input
          type="password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />

        <label style={{ ...styles.label, marginTop: '1rem' }}>Confirm Password</label>
        <input
          type="password"
          style={styles.input}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <p style={styles.switchText}>
          <span style={styles.link} onClick={onBack}>Back to Login</span>
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
    lineHeight: 1.5,
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
