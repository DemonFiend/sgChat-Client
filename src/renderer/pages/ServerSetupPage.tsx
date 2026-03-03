import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const electronAPI = (window as any).electronAPI;

export function ServerSetupPage({ onComplete }: { onComplete: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);

  // Pre-fill with saved server URL if one exists
  useEffect(() => {
    electronAPI.config.getServerUrl().then((saved: string) => {
      if (saved) setUrl(saved);
    });
  }, []);

  const handleConnect = async () => {
    setError('');
    const normalized = url.trim().replace(/\/+$/, '');
    if (!normalized) {
      setError('Please enter a server URL.');
      return;
    }

    try {
      new URL(normalized);
    } catch {
      setError('Please enter a valid URL (e.g., https://chat.example.com).');
      return;
    }

    setLoading(true);
    try {
      const result = await electronAPI.config.healthCheck(normalized);
      if (!result.ok) {
        setError(result.error || 'Could not reach server.');
        return;
      }

      setServerUrl(normalized);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.dragRegion} />
      <div style={styles.card}>
        <h1 style={styles.logo}>sgChat</h1>
        <p style={styles.subtitle}>Connect to your sgChat server</p>

        <label style={styles.label}>Server URL</label>
        <input
          type="url"
          style={styles.input}
          placeholder="https://chat.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          autoFocus
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
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
    background: '#1a1b1e',
    color: '#e1e1e6',
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
    color: '#5865f2',
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#8e8e93',
    fontSize: '0.95rem',
    marginBottom: '2.5rem',
  },
  label: {
    display: 'block',
    textAlign: 'left' as const,
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#b5b5be',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderRadius: 8,
    background: '#2b2d31',
    color: '#e1e1e6',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  error: {
    color: '#ed4245',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
    textAlign: 'left' as const,
  },
  btn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 8,
    background: '#5865f2',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '1.25rem',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
