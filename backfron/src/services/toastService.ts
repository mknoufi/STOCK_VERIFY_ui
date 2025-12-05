// Toast service for notifications
export const showToast = (
  message: string,
  type: "success" | "error" | "info" = "info",
) => {
  // Implementation would use a toast library
  console.log(`[${type.toUpperCase()}] ${message}`);
};

export const showSuccessToast = (message: string) =>
  showToast(message, "success");
export const showErrorToast = (message: string) => showToast(message, "error");
export const showInfoToast = (message: string) => showToast(message, "info");
