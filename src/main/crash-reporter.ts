import { app, ipcMain } from 'electron';
import { net } from 'electron';
import { getServerUrl, getAccessToken } from './store';
import { hasActiveSession, getSessionId, encrypt, isEncryptedPayload, decrypt } from './crypto';

function sanitizeStackTrace(stack: string): string {
  // Replace absolute Windows/Unix paths with relative
  let sanitized = stack.replace(/[A-Z]:\\[^\s:)]+/gi, (match) => {
    const parts = match.split(/[/\\]/);
    return parts.slice(-3).join('/');
  });
  sanitized = sanitized.replace(/\/[^\s:)]*\/[^\s:)]*/g, (match) => {
    const parts = match.split('/');
    return parts.slice(-3).join('/');
  });
  // Strip tokens and sensitive data
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9._-]+/g, '[JWT_REDACTED]');
  // Strip env var values
  sanitized = sanitized.replace(/(password|token|secret|key)\s*[:=]\s*'[^']*'/gi, '$1=[REDACTED]');
  sanitized = sanitized.replace(/(password|token|secret|key)\s*[:=]\s*"[^"]*"/gi, '$1=[REDACTED]');
  return sanitized;
}

async function submitCrashReport(report: {
  error_type: string;
  error_message: string;
  stack_trace: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const serverUrl = getServerUrl();
  if (!serverUrl) return;

  const body = {
    version: app.getVersion(),
    platform: process.platform,
    error_type: report.error_type,
    error_message: (report.error_message || '').slice(0, 1000),
    stack_trace: sanitizeStackTrace(report.stack_trace || '').slice(0, 10000),
    metadata: report.metadata || {},
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let requestBody: string;
  const cryptoActive = hasActiveSession();
  if (cryptoActive) {
    headers['X-Crypto-Session'] = getSessionId()!;
    requestBody = JSON.stringify(encrypt(body));
  } else {
    requestBody = JSON.stringify(body);
  }

  try {
    await net.fetch(`${serverUrl}/api/crash-reports`, {
      method: 'POST',
      headers,
      body: requestBody,
    });
  } catch {
    // Can't report if server is unreachable — silently fail
  }
}

export function initCrashReporter(): void {
  // Global exception handler
  process.on('uncaughtException', (error) => {
    console.error('[crash-reporter] Uncaught exception:', error);
    submitCrashReport({
      error_type: 'UncaughtException',
      error_message: error.message,
      stack_trace: error.stack || '',
    }).catch(() => {});
  });

  // Unhandled promise rejection
  process.on('unhandledRejection', (reason: any) => {
    console.error('[crash-reporter] Unhandled rejection:', reason);
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? (reason.stack || '') : '';
    submitCrashReport({
      error_type: 'UnhandledRejection',
      error_message: message,
      stack_trace: stack,
    }).catch(() => {});
  });

  // IPC handler for renderer crash reports
  ipcMain.handle('crash-report:submit', async (_event, report: {
    error_type: string;
    error_message: string;
    stack_trace: string;
    metadata?: Record<string, unknown>;
  }) => {
    await submitCrashReport(report);
    return { success: true };
  });
}

export { submitCrashReport };
