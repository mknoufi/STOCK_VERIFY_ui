/**
 * Performance Service - Optimizations and caching
 * Handles performance optimizations, debouncing, and lazy loading
 */

/**
 * Debounce function - delays execution until after wait time
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 1000
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize function - caches results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy load - loads data on demand
 */
export class LazyLoader<T> {
  private loader: () => Promise<T>;
  private data: T | null = null;
  private loading: boolean = false;
  private promise: Promise<T> | null = null;

  constructor(loader: () => Promise<T>) {
    this.loader = loader;
  }

  async load(): Promise<T> {
    if (this.data !== null) {
      return this.data;
    }

    if (this.loading && this.promise) {
      return this.promise;
    }

    this.loading = true;
    this.promise = this.loader().then((data) => {
      this.data = data;
      this.loading = false;
      return data;
    });

    return this.promise;
  }

  clear() {
    this.data = null;
    this.loading = false;
    this.promise = null;
  }

  getCached(): T | null {
    return this.data;
  }
}

/**
 * Batch operations - processes items in batches
 */
export class BatchProcessor<T> {
  private batchSize: number;
  private delay: number;

  constructor(batchSize: number = 10, delay: number = 100) {
    this.batchSize = batchSize;
    this.delay = delay;
  }

  async process(
    items: T[],
    processor: (batch: T[]) => Promise<void>,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const total = items.length;
    let processed = 0;

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      await processor(batch);
      processed += batch.length;

      if (onProgress) {
        onProgress(processed, total);
      }

      // Delay between batches
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
  }
}

/**
 * Cache manager - manages application cache
 */
export class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const appCache = new CacheManager();

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    appCache.cleanup();
  }, 5 * 60 * 1000);
}
