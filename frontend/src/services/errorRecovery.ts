export const handleErrorWithRecovery = async (operation: () => Promise<any>, options: any) => {
  try {
    return await operation();
  } catch (error) {
    if (options?.showAlert) {
      alert('An error occurred');
    }
    throw error;
  }
};

export const errorReporter = {
  report: (error: Error, source?: string, context?: Record<string, any>) => {
    console.error('Error reported:', { error, source, context });
  },
  captureException: (error: Error, context?: Record<string, any>) => {
    console.error('Exception captured:', error, context);
  },
};
