import axios, { AxiosInstance } from 'axios';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { storage } from './asyncStorageService';
import { toastService } from './toastService';
import { getBackendURL, getBackendURLSync, clearBackendURLCache } from '../utils/backendUrl';
import { API_TIMEOUT_MS } from '../constants/config';
import { flags } from '../constants/flags';
import { attachOfflineQueueInterceptors } from './offlineQueue';

// Ensure we always discover the latest backend endpoint on mobile devices
if (Platform.OS !== 'web') {
  clearBackendURLCache();
}

let API_BASE_URL = `${getBackendURLSync()}/api`;

if (__DEV__) {
  console.log('API Base URL (initial):', API_BASE_URL);
}

// Discover backend URL asynchronously so we can attach to the correct host when IPs change
(async () => {
  try {
    const backendUrl = await getBackendURL();
    API_BASE_URL = `${backendUrl}/api`;

    if (__DEV__) {
      console.log('✅ Auth API Base URL (discovered):', API_BASE_URL);
    }

    if (Platform.OS !== 'web' && backendUrl.includes('localhost') && __DEV__) {
      console.warn('⚠️  WARNING: Still using localhost on mobile device!');
      console.warn('   This will not work on physical devices.');
      console.warn('   Make sure device and computer are on the same WiFi network.');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to initialize backend URL:', error);
    }
  }
})();

let sessionExpiryNotified = false;

const notifySessionExpired = (message?: string) => {
  if (sessionExpiryNotified) {
    return;
  }

  sessionExpiryNotified = true;

  const finalMessage = message || 'Your session expired. Please login again.';
  try {
    toastService.showWarning(finalMessage);
  } catch (toastError) {
    if (__DEV__) {
      console.error('Toast notification error:', toastError);
    }
  }

  try {
    router.replace('/login');
  } catch (navigationError) {
    if (__DEV__) {
      console.error('Navigation error on session expiry:', navigationError);
    }
  }

  setTimeout(() => {
    sessionExpiryNotified = false;
  }, 4000);
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

// Attach offline queue interceptors when enabled
if (flags.enableOfflineQueue) {
  try {
    attachOfflineQueueInterceptors(apiClient);
  } catch (e) {
    if (__DEV__) {
      console.warn('Offline queue interceptor attach failed:', e);
    }
  }
}

// Request interceptor attaches dynamic backend URL + auth token
apiClient.interceptors.request.use(
  async (config) => {
    const requestStartTime = Date.now();
    const stepLog = (step: number, message: string, data?: unknown) => {
      if (__DEV__) {
        const elapsed = Date.now() - requestStartTime;
        console.log(`[API REQ STEP ${step}] [${elapsed}ms] ${message}`, data || '');
      }
    };

    try {
      stepLog(1, 'Request interceptor called', { method: config.method, url: config.url });

      stepLog(2, 'Getting backend URL');
      const backendUrl = await getBackendURL();
      config.baseURL = `${backendUrl}/api`;
      stepLog(2.1, 'Backend URL set', {
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
      });

      stepLog(3, 'Checking for auth token');
      const token = await storage.get('token');
      if (token) {
        const cleanToken = token.trim().replace(/\n/g, '').replace(/\r/g, '');
        config.headers.Authorization = `Bearer ${cleanToken}`;
        stepLog(3.1, '✅ Token added to headers', {
          tokenLength: cleanToken.length,
          originalLength: token.length,
          tokenPrefix: `${cleanToken.substring(0, 20)}...`,
          hasWhitespace: token !== cleanToken,
        });
      } else if (__DEV__) {
        stepLog(3.2, '⚠️ No token found - unauthenticated request');
      }

      stepLog(4, '✅ Request interceptor completed');
      return config;
    } catch (error) {
      stepLog(99, '❌ Request interceptor error', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    if (__DEV__) {
      console.error('Request interceptor error (reject):', error);
    }
    return Promise.reject(error);
  },
);

// Response interceptor centralizes auth expiry/offline handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      if (__DEV__) {
        // Use warn instead of error to avoid blocking red screen in Expo Go
        console.warn('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      }

      if (error.response.status === 401) {
        if (!originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const { useAuthStore } = await import('../store/authStore');
            const newToken = await useAuthStore.getState().refreshAccessToken();

            if (newToken) {
              const cleanToken = newToken.trim().replace(/\n/g, '').replace(/\r/g, '');
              originalRequest.headers.Authorization = `Bearer ${cleanToken}`;
              return apiClient(originalRequest);
            }
          } catch (refreshError) {
            if (__DEV__) {
              console.error('Token refresh failed:', refreshError);
            }
            try {
              const { useAuthStore } = await import('../store/authStore');
              await useAuthStore.getState().logout();
            } catch (logoutError) {
              if (__DEV__) {
                console.error('Logout error:', logoutError);
              }
            }

            const message =
              error.response?.data?.detail?.message ||
              error.response?.data?.message ||
              'Your session expired. Please login again.';
            notifySessionExpired(message);
            return Promise.reject(error);
          }
        }

        try {
          const { useAuthStore } = await import('../store/authStore');
          await useAuthStore.getState().logout();
        } catch (logoutError) {
          if (__DEV__) {
            console.error('Logout error:', logoutError);
          }
        }

        const message =
          error.response?.data?.detail?.message ||
          error.response?.data?.message ||
          'Your session expired. Please login again.';
        notifySessionExpired(message);
        return Promise.reject(error);
      }
    } else if (__DEV__) {
      console.error('API Error (no response):', error.message);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
