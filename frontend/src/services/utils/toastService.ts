export interface ToastOptions {
  duration?: 'short' | 'long';
  position?: 'top' | 'bottom' | 'center';
  type?: 'success' | 'error' | 'info' | 'warning';
}

interface ToastData {
  id?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

type ToastEventHandler = (data: ToastData) => void;

export class ToastService {
  private events: Map<string, ToastEventHandler[]> = new Map();
  private toastId = 0;

  on(event: string, handler: ToastEventHandler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  off(event: string, handler: ToastEventHandler) {
    if (!this.events.has(event)) return;
    const handlers = this.events.get(event)!;
    this.events.set(
      event,
      handlers.filter((h) => h !== handler)
    );
  }

  private emit(event: string, data: ToastData) {
    if (!this.events.has(event)) return;
    this.events.get(event)!.forEach((handler) => handler(data));
  }

  show(message: string, options?: ToastOptions | string) {
    // Support both old string format and new object format
    const opts: ToastOptions =
      typeof options === 'string' ? { type: options as ToastData['type'] } : options || {};

    const id = `toast_${++this.toastId}`;
    const duration = opts.duration === 'long' ? 5000 : 3000;

    this.emit('show', {
      id,
      message,
      type: opts.type || 'info',
      duration,
    });

    // Auto-hide after duration
    setTimeout(() => this.hide(id), duration);
  }

  hide(id: string) {
    this.emit('hide', { id, message: '', type: 'info' as const });
  }

  clear() {
    this.emit('clear', { message: '', type: 'info' as const });
  }

  showSuccess(message: string) {
    this.show(message, { type: 'success' });
  }

  showError(message: string) {
    this.show(message, { type: 'error' });
  }

  showWarning(message: string) {
    this.show(message, { type: 'warning' });
  }

  showInfo(message: string) {
    this.show(message, { type: 'info' });
  }
}

// Export singleton instance
export const toastService = new ToastService();

export const useToast = () => {
  const showToast = (message: string, options?: ToastOptions | string) => {
    toastService.show(message, options);
  };

  const showSuccess = (message: string) => {
    toastService.showSuccess(message);
  };

  const showError = (message: string) => {
    toastService.showError(message);
  };

  const showWarning = (message: string) => {
    toastService.showWarning(message);
  };

  const showInfo = (message: string) => {
    toastService.showInfo(message);
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default toastService;
