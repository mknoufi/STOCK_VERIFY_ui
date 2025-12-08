/**
 * Enhanced API service with better error handling and loading states
 */
import api from "../httpClient";

export class EnhancedApiService {
  private static loadingStates: Map<string, boolean> = new Map();
  private static cache: Map<
    string,
    { data: any; timestamp: number; ttl: number }
  > = new Map();

  /**
   * Get loading state for a specific operation
   */
  static isLoading(operation: string): boolean {
    return this.loadingStates.get(operation) || false;
  }

  /**
   * API call with automatic loading state management
   */
  static async withLoading<T>(
    operation: string,
    apiCall: () => Promise<T>,
    options: { cache?: boolean; cacheTtl?: number } = {},
  ): Promise<T> {
    this.loadingStates.set(operation, true);

    try {
      // Check cache first
      if (options.cache) {
        const cached = this.cache.get(operation);
        if (cached && Date.now() - cached.timestamp < (cached.ttl || 300000)) {
          // 5 min default
          this.loadingStates.set(operation, false);
          return cached.data;
        }
      }

      const result = await apiCall();

      // Cache result if requested
      if (options.cache) {
        this.cache.set(operation, {
          data: result,
          timestamp: Date.now(),
          ttl: options.cacheTtl || 300000,
        });
      }

      return result;
    } finally {
      this.loadingStates.set(operation, false);
    }
  }

  /**
   * Enhanced barcode lookup with loading state
   */
  static async lookupBarcode(barcode: string): Promise<any> {
    return this.withLoading(
      `barcode-${barcode}`,
      async () => {
        const response = await api.get(
          `/api/erp/items/barcode/${encodeURIComponent(barcode)}`,
        );
        return response.data;
      },
      { cache: true, cacheTtl: 600000 }, // Cache for 10 minutes
    );
  }

  /**
   * Enhanced session loading with loading state
   */
  static async getSessions(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<any> {
    return this.withLoading(
      `sessions-${page}`,
      async () => {
        const response = await api.get(
          `/api/sessions?page=${page}&page_size=${pageSize}`,
        );
        return response.data;
      },
      { cache: false }, // Don't cache session data (changes frequently)
    );
  }

  /**
   * Clear cache for specific operation or all
   */
  static clearCache(operation?: string): void {
    if (operation) {
      this.cache.delete(operation);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.keys()),
    };
  }
}
