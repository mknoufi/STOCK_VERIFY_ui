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
