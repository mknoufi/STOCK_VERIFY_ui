export const initSentry = () => {
  // Sentry initialization would go here
  if (__DEV__) {
    console.log("Sentry initialized (stub)");
  }
};

export interface CaptureContext {
  context?: string;
  message?: string;
  [key: string]: unknown;
}

export const captureException = (error: Error, context?: CaptureContext) => {
  console.error("Captured exception:", error, context);
};
