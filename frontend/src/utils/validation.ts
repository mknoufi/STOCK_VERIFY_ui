export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  error?: string;
}

/**
 * Minimum and maximum barcode length constants
 */
export const BARCODE_MIN_LENGTH = 6;
export const BARCODE_MAX_LENGTH = 50;

/**
 * Sanitize barcode input by removing dangerous characters.
 * Only allows alphanumeric, hyphens, and underscores.
 * Returns null if barcode is invalid (empty, too short, too long, or contains only invalid chars)
 */
export const sanitizeBarcode = (barcode: string): string | null => {
  if (!barcode) return null;

  // Trim and remove dangerous characters
  const sanitized = barcode.trim().replace(/[^a-zA-Z0-9\-_]/g, "");

  // Validate length
  if (sanitized.length < BARCODE_MIN_LENGTH) {
    return null; // Too short
  }

  if (sanitized.length > BARCODE_MAX_LENGTH) {
    return null; // Too long - potential attack
  }

  return sanitized;
};

/**
 * Validate barcode and return detailed error message
 */
export const validateBarcode = (barcode: string): ValidationResult<string> => {
  if (!barcode || !barcode.trim()) {
    return { valid: false, error: "Please enter a barcode" };
  }

  const sanitized = barcode.trim().replace(/[^a-zA-Z0-9\-_]/g, "");

  if (sanitized !== barcode.trim()) {
    return { valid: false, error: "Barcode contains invalid characters" };
  }

  if (sanitized.length < BARCODE_MIN_LENGTH) {
    return { valid: false, error: `Barcode must be at least ${BARCODE_MIN_LENGTH} characters` };
  }

  if (sanitized.length > BARCODE_MAX_LENGTH) {
    return { valid: false, error: `Barcode is too long (max ${BARCODE_MAX_LENGTH} characters)` };
  }

  return { valid: true, value: sanitized };
};

export const sanitizeText = (value: string): string => value.replace(/[<>"']/g, "").trim();

export const validateQuantity = (qty: string | number): ValidationResult<number> => {
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
  // Pad numeric barcodes to 6 digits if they are shorter
  // Removed auto-padding to support short internal codes
  // if (trimmed.match(/^\d+$/) && trimmed.length < 6) {
  //   return trimmed.padStart(6, "0");
  // }
  return trimmed;
};

export const validateBarcode = (barcode: string): ValidationResult<string> => {
  if (!barcode || !barcode.trim()) {
    return { valid: false, error: "Barcode cannot be empty" };
  }

  const trimmed = barcode.trim().toUpperCase();

  // Check minimum length logic based on content type
  // Numeric barcodes (UPC-E, EAN) are usually at least 6 digits
  // Alphanumeric Item Codes can be shorter (e.g., "A1", "BOX")

  if (trimmed.match(/^\d+$/)) {
    if (trimmed.length < 2) {
      return {
        valid: false,
        error: "Invalid barcode: numeric barcodes must be at least 2 digits",
      };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: "Barcode is too long (max 20 digits)" };
    }
    return { valid: true, value: trimmed };
  }

  if (trimmed.match(/^[A-Za-z0-9_\-]+$/)) {
    if (trimmed.length < 2) {
      return { valid: false, error: "Item code must be at least 2 characters" };
    }
    if (trimmed.length > 50) {
      return { valid: false, error: "Item code is too long (max 50 characters)" };
    }
    return { valid: true, value: trimmed };
  }

  return {
    valid: false,
    error: "Invalid barcode format. Use letters, numbers, hyphens, and underscores.",
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
