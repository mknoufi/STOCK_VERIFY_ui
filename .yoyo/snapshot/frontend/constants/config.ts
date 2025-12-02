export const API_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 10000;
export const API_MAX_RETRIES = 3;
export const API_RETRY_BACKOFF_MS = 750;

export const QUERY_STALE_TIME_MS = 1000 * 60 * 5;
export const QUERY_CACHE_TIME_MS = 1000 * 60 * 30;

export const SESSION_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 500;

export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

