import { create } from 'zustand';
import { storage } from '../services/asyncStorageService';
import axios from 'axios';
import { getBackendURL, getBackendURLSync, initializeBackendURL } from '../utils/backendUrl';

const setOrRemoveItem = async (key: string, value?: string | null) => {
  if (value) {
    await storage.set(key, value);
  } else {
    await storage.remove(key);
  }
};

// Helper to get current API URL (always fetch fresh to avoid stale values)
const getAPIURL = async (): Promise<string> => {
  const backendUrl = await getBackendURL();
  return backendUrl + '/api';
};

interface User {
  username: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,

  login: async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      const apiUrl = await getAPIURL();
      // Security: Minimal logging in production
      if (__DEV__) {
        console.log('=== LOGIN ATTEMPT ===');
        console.log(`API URL: ${apiUrl}/auth/login`);
        console.log(`Username: ${username}`);
        console.log(`Password length: ${password.length}`);
      }

      const response = await axios.post(`${apiUrl}/auth/login`, {
        username,
        password,
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (__DEV__) {
        console.log('Login response status:', response.status);
        // Don't log full response data in production (may contain sensitive info)
        console.log('Login response received');
      }

            // Extract from ApiResponse wrapper: { success, data: { access_token, ... }, error }
            const responseData = response.data.data || response.data;
            const { access_token, refresh_token, user } = responseData;

            if (!access_token || !user) {
              throw new Error('Invalid response from server');
            }

            // Fetch user permissions from /api/auth/me or use permissions from login response
            let userWithPermissions = user;
            if (!user.permissions) {
              try {
                const apiUrl = await getAPIURL();
                const meResponse = await axios.get(`${apiUrl}/auth/me`, {
                  headers: {
                    'Authorization': `Bearer ${access_token}`,
                  },
                });
                userWithPermissions = {
                  ...user,
                  permissions: meResponse.data.permissions || [],
                };
              } catch (permError) {
                console.warn('Failed to fetch permissions, using empty array:', permError);
                userWithPermissions = {
                  ...user,
                  permissions: [],
                };
              }
            }

            // Store tokens and user data with permissions
            // Security: Don't log tokens in production
            if (__DEV__) {
              console.log('Storing access_token:', access_token?.substring(0, 50) + '...');
              console.log('Storing refresh_token:', refresh_token ? '***' : 'null');
            }
            await setOrRemoveItem('token', access_token);
            await setOrRemoveItem('refresh_token', refresh_token);
            await storage.set('user', userWithPermissions);

            set({ user: userWithPermissions, token: access_token, refreshToken: refresh_token });
            if (__DEV__) {
              console.log('Login successful:', userWithPermissions.username, 'with', userWithPermissions.permissions.length, 'permissions');
            }
            return true;
        } catch (error: unknown) {
          // Use warn to avoid red screen in Expo Go
          console.warn('Login error:', error);

          // Type guard for axios error with response
          const isAxiosError = (err: unknown): err is {
            response?: {
              data?: any;
              status?: number;
            };
            code?: string;
            message?: string;
          } => {
            return typeof err === 'object' && err !== null;
          };

          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              name: error.name,
            });
          }

          // Use structured error response if available
          if (isAxiosError(error) && error.response?.data) {
            const errorData = error.response.data;
            if (typeof errorData === 'object' && errorData.message) {
              throw new Error(errorData.message);
            } else if (typeof errorData === 'object' && errorData.detail) {
              if (typeof errorData.detail === 'object' && errorData.detail.message) {
                throw new Error(errorData.detail.message);
              } else if (typeof errorData.detail === 'string') {
                throw new Error(errorData.detail);
              }
            }
          }

          // Fallback to code-based messages
          if (isAxiosError(error)) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
              throw new Error('Connection timeout. Please check if the backend server is running.');
            } else if (error.code === 'ECONNREFUSED' || !error.response || error.message?.includes('Network Error')) {
              const backendUrl = await getBackendURL();
              throw new Error(`Cannot connect to server at ${backendUrl}.\n\nIf on mobile device, use your computer's IP address instead of localhost.\nSet EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8001 in the .env file.`);
            } else if (error.response?.status === 401) {
              throw new Error('Invalid username or password');
            } else if (error.response?.status === 429) {
              throw new Error('Too many requests. Please try again later.');
            } else {
              throw new Error(error.response?.data?.detail?.message || error.response?.data?.detail || error.response?.data?.message || error.message || 'Login failed');
            }
          }

          // Fallback for non-axios errors
          if (error instanceof Error) {
            throw new Error(error.message);
          }

          throw new Error('Login failed');
        }
  },

  logout: async () => {
    try {
      const refreshToken = await storage.get('refresh_token');
      if (refreshToken) {
        // Revoke refresh token on server
        try {
          const apiUrl = await getAPIURL();
          await axios.post(`${apiUrl}/auth/logout`, { refresh_token: refreshToken }, {
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error: unknown) {
          console.error('Error revoking token:', error);
        }
      }
    } catch (error: unknown) {
      console.error('Logout error:', error);
    } finally {
      await Promise.all([
        storage.remove('token'),
        storage.remove('refresh_token'),
        storage.remove('user')
      ]);
      set({ user: null, token: null, refreshToken: null });
    }
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = await storage.get('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const apiUrl = await getAPIURL();
      const response = await axios.post(`${apiUrl}/auth/refresh`, {
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Extract from ApiResponse wrapper: { success, data: { access_token, ... }, error }
      const responseData = response.data.data || response.data;
      const { access_token, refresh_token: new_refresh_token, user: userData } = responseData;

      if (!access_token) {
        throw new Error('Invalid refresh response');
      }

      // Update tokens and user
      await setOrRemoveItem('token', access_token);
      await setOrRemoveItem('refresh_token', new_refresh_token);
      if (userData) {
        await storage.set('user', userData);
      }

      const currentUser = useAuthStore.getState().user;
      set({
        token: access_token,
        refreshToken: new_refresh_token,
        user: userData || currentUser
      });
      return access_token;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      await useAuthStore.getState().logout();
      throw error;
    }
  },

  loadStoredAuth: async () => {
    try {
      const [token, refreshToken, user] = await Promise.all([
        storage.get('token'),
        storage.get('refresh_token'),
        storage.get('user'),
      ]);

      if (token && user) {
        try {
          const apiUrl = await getAPIURL();
          await axios.get(`${apiUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000,
          });
          set({ user, token, refreshToken, isLoading: false });
          return;
        } catch (verifyError: any) {
          console.warn('Stored credentials are no longer valid. Clearing cached session.', {
            status: verifyError?.response?.status,
            detail: verifyError?.response?.data,
          });
          await Promise.all([
            storage.remove('token'),
            storage.remove('refresh_token'),
            storage.remove('user')
          ]);
        }
      }

      set({ user: null, token: null, refreshToken: null, isLoading: false });
    } catch (error: unknown) {
      console.error('Load auth error:', error);
      set({ isLoading: false });
    }
  },
}));
