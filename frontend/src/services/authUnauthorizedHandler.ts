export type UnauthorizedHandler = () => void | Promise<void>;

let handler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (next: UnauthorizedHandler | null) => {
  handler = next;
};

export const handleUnauthorized = () => {
  try {
    const result = handler?.();
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // Best-effort; auth store will handle logout UX separately.
  }
};

