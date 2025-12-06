export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  error?: string;
}

export const sanitizeText = (value: string): string =>
  value.replace(/[<>"']/g, "").trim();

export const validateQuantity = (
  qty: string | number,
): ValidationResult<number> => {
  const numericValue = typeof qty === "string" ? parseFloat(qty) : qty;

  if (Number.isNaN(numericValue)) {
    return { valid: false, error: "Quantity must be a number" };
  }

  if (!Number.isFinite(numericValue)) {
    return { valid: false, error: "Quantity must be finite" };
  }

  if (numericValue < 0) {
    return { valid: false, error: "Quantity cannot be negative" };
  }

  return { valid: true, value: numericValue };
};

export const validateSessionName = (
  floorName: string,
  rackName: string,
): ValidationResult<string> => {
  const floor = sanitizeText(floorName);
  const rack = sanitizeText(rackName);

  if (!floor) {
    return { valid: false, error: "Please enter a floor name/number" };
  }

  if (!rack) {
    return { valid: false, error: "Please enter a rack name/number" };
  }

  const sessionName = `${floor} - ${rack}`;

  if (sessionName.length < 2) {
    return {
      valid: false,
      error: "Session name must be at least 2 characters",
    };
  }

  if (sessionName.length > 100) {
    return {
      valid: false,
      error: "Session name must be less than 100 characters",
    };
  }

  return { valid: true, value: sessionName };
};

export const normalizeBarcode = (barcode: string): string => {
  const trimmed = barcode.trim();
  // If purely numeric and less than 6 digits, pad with zeros
  if (/^\d+$/.test(trimmed) && trimmed.length < 6) {
    return trimmed.padStart(6, "0");
  }
  return trimmed;
};

export const validateBarcode = (barcode: string): ValidationResult<string> => {
  if (!barcode || !barcode.trim()) {
    return { valid: false, error: "Barcode cannot be empty" };
  }

  const trimmed = barcode.trim();

  // Allow alphanumeric and common symbols (-_.)
  // Code 128 allows all ASCII, but we restrict to safe chars for now
  if (trimmed.match(/^[A-Za-z0-9\-\_\.]+$/)) {
    if (trimmed.length > 50) {
      return { valid: false, error: "Barcode is too long (max 50 characters)" };
    }
    return { valid: true, value: normalizeBarcode(trimmed) };
  }

  return {
    valid: false,
    error: "Invalid barcode format. Use letters, numbers, -, _ or .",
  };
};

export const validateMRP = (value: string): ValidationResult<number> => {
  if (!value) {
    return { valid: false, error: "Please enter an MRP value" };
  }

  const parsed = parseFloat(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    return { valid: false, error: "Please enter a valid MRP value" };
  }

  return { valid: true, value: parsed };
};
