/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */

import { flags } from '../constants/flags';

let SentryInitialized = false;

export const initSentry = async () => {
  // Only initialize in production or if explicitly enabled
  if (!flags.enableAnalytics && __DEV__) {
    return;
  }

  if (SentryInitialized) {
    return;
  }

  try {
    const Sentry = await import('@sentry/react-native');

    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '', // Set in .env
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      // Performance monitoring
      tracesSampleRate: __DEV__ ? 0.0 : 0.2, // 20% of transactions in production
      // Session replay (optional)
      enableAutoSessionTracking: true,
      // Release tracking
      release: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive data from events
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.Authorization;
        }
        return event;
      },
    });

    SentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.warn('[Sentry] Failed to initialize:', error);
  }
};

export const captureException = async (error: Error, context?: Record<string, any>) => {
  if (!SentryInitialized) return;

  try {
    const Sentry = await import('@sentry/react-native');
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (e) {
    console.warn('[Sentry] Failed to capture exception:', e);
  }
};

export const captureMessage = async (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (!SentryInitialized) return;

  try {
    const Sentry = await import('@sentry/react-native');
    Sentry.captureMessage(message, level);
  } catch (e) {
    console.warn('[Sentry] Failed to capture message:', e);
  }
};

export const setUser = async (user: { id: string; email?: string; username?: string }) => {
  if (!SentryInitialized) return;

  try {
    const Sentry = await import('@sentry/react-native');
    Sentry.setUser(user);
  } catch (e) {
    console.warn('[Sentry] Failed to set user:', e);
  }
};

export const clearUser = async () => {
  if (!SentryInitialized) return;

  try {
    const Sentry = await import('@sentry/react-native');
    Sentry.setUser(null);
  } catch (e) {
    console.warn('[Sentry] Failed to clear user:', e);
  }
};
