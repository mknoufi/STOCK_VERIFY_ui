export const initSentry = () => {
  // Sentry initialization would go here
  if (__DEV__) {
    console.log('Sentry initialized (stub)');
  }
};

export const captureException = (error: Error) => {
  console.error('Captured exception:', error);
};
