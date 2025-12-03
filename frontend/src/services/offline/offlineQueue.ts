import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
// import apiClient from './httpClient';
import { storage } from '../storage/asyncStorageService';
import { useNetworkStore } from '../../store/networkStore';
import { flags } from '../../constants/flags';
import { toastService } from '../utils/toastService';
import { onlineManager } from '@tanstack/react-query';

// NOTE: This module is entirely gated by flags.enableOfflineQueue
// It safely no-ops when the flag is false.

const STORAGE_KEY = 'offlineQueue:v1';
const CONFLICTS_KEY = 'offlineQueue:conflicts:v1';

export type QueueMethod = 'post' | 'put' | 'patch' | 'delete';

export interface QueuedMutation {
  id: string;
  method: QueueMethod;
  url: string; // relative to api base (config.baseURL set by interceptor)
  data?: any;
  params?: any;
  headers?: Record<string, string>;
  createdAt: number;
  retries: number;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadQueue(): Promise<QueuedMutation[]> {
  const list = await storage.get<QueuedMutation[]>(STORAGE_KEY, { defaultValue: [] });
  return Array.isArray(list) ? list : [];
}

async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  await storage.set(STORAGE_KEY, queue, { silent: true });
}

async function addConflict(item: QueuedMutation, detail?: any): Promise<void> {
  const existing = (await storage.get<any[]>(CONFLICTS_KEY, { defaultValue: [] })) || [];
  const record = { ...item, detail, resolved: false, timestamp: Date.now() };
  existing.push(record);
  await storage.set(CONFLICTS_KEY, existing, { silent: true });
}

function isMutatingMethod(method?: string): method is QueueMethod {
  if (!method) return false;
  const m = method.toLowerCase();
  return m === 'post' || m === 'put' || m === 'patch' || m === 'delete';
}

export async function enqueueMutation(config: AxiosRequestConfig): Promise<QueuedMutation> {
  const queue = await loadQueue();
  const item: QueuedMutation = {
    id: generateId(),
    method: (config.method || 'post').toLowerCase() as QueueMethod,
    url: config.url || '/',
    data: config.data,
    params: config.params,
    headers: config.headers as Record<string, string> | undefined,
    createdAt: Date.now(),
    retries: 0,
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

let flushing = false;

export async function flushOfflineQueue(client: AxiosInstance): Promise<{ processed: number; remaining: number; }> {
  if (!flags.enableOfflineQueue) return { processed: 0, remaining: 0 };
  if (flushing) return { processed: 0, remaining: (await loadQueue()).length };

  const { isOnline, isInternetReachable } = useNetworkStore.getState();
  const online = isOnline && (isInternetReachable ?? true);
  onlineManager.setOnline(online);
  if (!online) return { processed: 0, remaining: (await loadQueue()).length };

  flushing = true;
  try {
    let queue = await loadQueue();
    let processed = 0;

    while (queue.length > 0) {
      const item = queue[0]!;
      try {
        await client.request({
          method: item.method,
          url: item.url,
          data: item.data,
          params: item.params,
          headers: item.headers,
        });
        processed += 1;
      } catch (err) {
        const error = err as AxiosError;
        const status = error.response?.status;
        // Network still down or server unreachable: stop processing, keep remaining
        if (!error.response) {
          break;
        }
        // Conflict or validation error: record and drop this item, continue
        if (status && (status === 409 || status === 422 || status === 400)) {
          await addConflict(item, error.response?.data);
          processed += 1; // we consider it handled (moved to conflicts)
        } else {
          // Other server error: leave item in queue for later retry
          break;
        }
      }
      // Remove the head item we just processed
      queue = queue.slice(1);
      await saveQueue(queue);
    }

    return { processed, remaining: queue.length };
  } finally {
    flushing = false;
  }
}

let unsubscribeNetwork: (() => void) | null = null;
let interceptorsAttached = false;

export function startOfflineQueue(client: AxiosInstance): void {
  if (!flags.enableOfflineQueue) return;

  // Sync initial online status with React Query
  const { isOnline, isInternetReachable } = useNetworkStore.getState();
  onlineManager.setOnline(isOnline && (isInternetReachable ?? true));

  // Subscribe to network changes to auto-flush
  if (!unsubscribeNetwork) {
    unsubscribeNetwork = useNetworkStore.subscribe((state: any, prev: any) => {
      const online = state.isOnline && (state.isInternetReachable ?? true);
      onlineManager.setOnline(online);
      if (online && !flushing) {
        flushOfflineQueue(client).then((res) => {
          if (__DEV__ && (res.processed > 0 || res.remaining >= 0)) {
            __DEV__ && console.log(`OfflineQueue: flushed processed=${res.processed} remaining=${res.remaining}`);
          }
          if (res.processed > 0) {
            try { toastService.showSuccess(`Synced ${res.processed} queued change(s)`); } catch { }
          }
        }).catch(() => { });
      }
    });
  }

  // Attach axios interceptors once
  if (!interceptorsAttached) {
    attachOfflineQueueInterceptors(client);
    interceptorsAttached = true;
  }

  // Try initial flush
  flushOfflineQueue(client).catch(() => { });
}

export function stopOfflineQueue(): void {
  if (unsubscribeNetwork) {
    try { unsubscribeNetwork(); } catch { }
    unsubscribeNetwork = null;
  }
}

export function attachOfflineQueueInterceptors(client: AxiosInstance): void {
  if (!flags.enableOfflineQueue) return;

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const cfg: AxiosRequestConfig = error.config || {};
      const method = (cfg.method || '').toLowerCase();

      // Only handle mutating requests
      if (!isMutatingMethod(method)) {
        return Promise.reject(error);
      }

      const { isOnline, isInternetReachable } = useNetworkStore.getState();
      const online = isOnline && (isInternetReachable ?? true);

      // If offline or network error with no response, queue it
      const isNetworkError = !error.response;
      if (!online || isNetworkError) {
        const item = await enqueueMutation(cfg);
        if (__DEV__) {
          __DEV__ && console.warn('OfflineQueue: queued mutation', { id: item.id, method: item.method, url: item.url });
        }
        try {
          toastService.showInfo('Saved offline. Will sync when online.');
        } catch { }
        // Resolve with a synthetic response to unblock UI if desired, otherwise reject
        // Here we reject so callers can decide how to reflect queued state
        return Promise.reject(error);
      }

      return Promise.reject(error);
    },
  );
}

// --- Helpers for UI ---
export async function getQueueCount(): Promise<number> {
  const q = await loadQueue();
  return q.length;
}

export async function listQueue(): Promise<QueuedMutation[]> {
  return loadQueue();
}

export async function getConflicts(): Promise<any[]> {
  return (await storage.get<any[]>(CONFLICTS_KEY, { defaultValue: [] })) || [];
}

export async function getConflictsCount(): Promise<number> {
  const c = await getConflicts();
  return c.length;
}

export async function resolveConflict(id: string): Promise<boolean> {
  const list = await getConflicts();
  const next = list.filter((c) => c.id !== id);
  await storage.set(CONFLICTS_KEY, next, { silent: true });
  return next.length !== list.length;
}
