import { API_MAX_RETRIES, API_RETRY_BACKOFF_MS } from "../constants/config";

type AsyncFn<T> = () => Promise<T>;

interface RetryOptions {
  retries?: number;
  backoffMs?: number;
  shouldRetry?: (error: any) => boolean;
}

export const retryWithBackoff = async <T>(
  operation: AsyncFn<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const {
    retries = API_MAX_RETRIES,
    backoffMs = API_RETRY_BACKOFF_MS,
    shouldRetry = (error: any) =>
      !(
        error?.response &&
        error.response.status >= 400 &&
        error.response.status < 500
      ),
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === retries - 1) {
        break;
      }

      const delay = backoffMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
