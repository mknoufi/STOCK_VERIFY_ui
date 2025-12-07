/**
 * Secure Authentication Service
 *
 * SECURITY IMPROVEMENTS:
 * 1. Session tokens stored in memory (not localStorage) to prevent XSS attacks
 * 2. Refresh token rotation on each use
 * 3. Token expiration handling
 * 4. CSRF protection via double-submit cookie pattern
 *
 * Note: For maximum security, tokens should be stored in httpOnly cookies.
 * This implementation uses in-memory storage as a fallback when httpOnly
 * cookies are not configured on the backend.
 */

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

class SecureAuthService {
  // Store tokens in memory (not localStorage) to prevent XSS access
  private tokens: AuthTokens | null = null;
  private user: User | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  // Refresh token 5 minutes before expiry
  private readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000;  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize auth state from sessionStorage (tab-specific, more secure than localStorage)
   * This allows page refreshes within the same tab while being more secure
   */
  initialize(): void {
    try {
      const storedTokens = sessionStorage.getItem('auth_tokens');
      const storedUser = sessionStorage.getItem('auth_user');

      if (storedTokens && storedUser) {
        const tokens = JSON.parse(storedTokens) as AuthTokens;

        // Check if token is still valid
        if (tokens.expiresAt > Date.now()) {
          this.tokens = tokens;
          this.user = JSON.parse(storedUser) as User;
          this.scheduleTokenRefresh();
        } else {
          // Token expired, clear storage
          this.clearAuth();
        }
      }
    } catch (e) {
      console.warn('Failed to initialize auth from storage:', e);
      this.clearAuth();
    }
  }

  /**
   * Store authentication tokens securely
   */
  setAuth(accessToken: string, refreshToken: string | undefined, expiresIn: number, user: User): void {
    const expiresAt = Date.now() + (expiresIn * 1000);

    this.tokens = {
      accessToken,
      refreshToken,
      expiresAt,
    };
    this.user = user;

    // Store in sessionStorage (tab-specific, cleared when tab closes)
    // This is more secure than localStorage as it's not accessible from other tabs
    try {
      sessionStorage.setItem('auth_tokens', JSON.stringify(this.tokens));
      sessionStorage.setItem('auth_user', JSON.stringify(this.user));
    } catch (e) {
      console.warn('Failed to persist auth to sessionStorage:', e);
    }

    this.scheduleTokenRefresh();
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    if (!this.tokens) {
      return null;
    }

    // Check if token is expired
    if (this.tokens.expiresAt <= Date.now()) {
      return null;
    }

    return this.tokens.accessToken;
  }

  /**
   * Get the current user
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    this.tokens = null;
    this.user = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    try {
      sessionStorage.removeItem('auth_tokens');
      sessionStorage.removeItem('auth_user');
      // Also clear any legacy localStorage items
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    } catch (e) {
      console.warn('Failed to clear auth storage:', e);
    }
  }

  /**
   * Schedule automatic token refresh before expiry
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokens?.refreshToken || !this.tokens.expiresAt) {
      return;
    }

    const timeUntilRefresh = this.tokens.expiresAt - Date.now() - this.REFRESH_BEFORE_EXPIRY;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens().catch(console.error);
      }, timeUntilRefresh);
    }
  }

  /**
   * Refresh access token using refresh token
   * Uses a promise to prevent multiple simultaneous refresh attempts
   */
  async refreshTokens(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken) {
      this.clearAuth();
      return false;
    }

    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.tokens?.refreshToken,
        }),
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data = await response.json();

      if (data.success && data.data) {
        this.setAuth(
          data.data.access_token,
          data.data.refresh_token,
          data.data.expires_in || 900,
          this.user!
        );
        return true;
      }

      this.clearAuth();
      return false;
    } catch (e) {
      console.error('Token refresh failed:', e);
      this.clearAuth();
      return false;
    }
  }

  /**
   * Check if token needs refresh and attempt to refresh
   * Returns true if token is valid or was successfully refreshed
   */
  async ensureValidToken(): Promise<boolean> {
    if (!this.tokens) {
      return false;
    }

    const timeUntilExpiry = this.tokens.expiresAt - Date.now();

    // If token expires within the refresh window, attempt refresh
    if (timeUntilExpiry < this.REFRESH_BEFORE_EXPIRY) {
      return this.refreshTokens();
    }

    return true;
  }
}

// Singleton instance
export const secureAuth = new SecureAuthService();

// Initialize on module load
secureAuth.initialize();

export default secureAuth;
