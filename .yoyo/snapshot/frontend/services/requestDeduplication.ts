/**
 * Request Deduplication Service
 * Prevents duplicate API calls by tracking pending requests
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicationService {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Get or create a request
   * If a request with the same key is already pending, return the existing promise
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    const existing = this.pendingRequests.get(key);
    
    if (existing) {
      // Check if request is still valid (not expired)
      const age = Date.now() - existing.timestamp;
      if (age < this.REQUEST_TIMEOUT) {
        // Return existing promise
        return existing.promise as Promise<T>;
      } else {
        // Request expired, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Remove from pending after completion
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Generate a request key from URL and params
   */
  generateKey(url: string, params?: Record<string, unknown>): string {
    const paramsStr = params
      ? Object.keys(params)
          .sort()
          .map((key) => `${key}=${JSON.stringify(params[key])}`)
          .join('&')
      : '';
    return `${url}?${paramsStr}`;
  }

  /**
   * Clear expired requests
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Export singleton instance
export const requestDeduplication = new RequestDeduplicationService();

// Export class for custom instances
export default RequestDeduplicationService;

