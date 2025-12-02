/**
 * Validation Service - Data validation and sanitization
 * Handles input validation, data sanitization, and validation rules
 * 
 * @deprecated Use utils/validation.ts instead for barcode validation.
 * This service is kept for backward compatibility but should not be used for new code.
 * For barcode validation, use validateBarcode() and normalizeBarcode() from utils/validation.ts
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validation Service
 */
export class ValidationService {
  /**
   * Validate field
   */
  static validateField(value: any, rule: ValidationRule, fieldName: string): string | null {
    // Required check
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${fieldName} is required`;
    }

    // Skip other checks if value is empty (unless required)
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    // String length checks
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${fieldName} must be at least ${rule.minLength} characters`;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return `${fieldName} must be at most ${rule.maxLength} characters`;
      }
    }

    // Pattern check
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }

    // Number range checks
    if (typeof value === 'number' || !isNaN(Number(value))) {
      const numValue = typeof value === 'number' ? value : Number(value);

      if (rule.min !== undefined && numValue < rule.min) {
        return `${fieldName} must be at least ${rule.min}`;
      }

      if (rule.max !== undefined && numValue > rule.max) {
        return `${fieldName} must be at most ${rule.max}`;
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  /**
   * Validate form
   */
  static validateForm(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(rules)) {
      const error = this.validateField(data[field], rule, field);
      if (error) {
        errors[field] = error;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Sanitize string
   */
  static sanitizeString(value: string): string {
    if (typeof value !== 'string') {
      return String(value || '');
    }

    return value
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Sanitize number
   */
  static sanitizeNumber(value: any): number | null {
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }

    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }

    return null;
  }

  /**
   * Normalize barcode to 6-digit format (for numeric barcodes)
   */
  static normalizeBarcode(barcode: string): string {
    const trimmed = barcode.trim();

    // If numeric and less than 6 digits, pad with leading zeros
    if (trimmed.match(/^\d+$/)) {
      if (trimmed.length < 6) {
        return trimmed.padStart(6, '0');
      }
      // If more than 6 digits, try trimming leading zeros first
      if (trimmed.length > 6) {
        const trimmedNoZeros = trimmed.replace(/^0+/, '');
        if (trimmedNoZeros.length <= 6) {
          return trimmedNoZeros.padStart(6, '0');
        }
      }
    }

    return trimmed;
  }

  /**
   * Validate barcode format
   */
  static validateBarcode(barcode: string): { valid: boolean; error?: string; normalized?: string } {
    if (!barcode || !barcode.trim()) {
      return { valid: false, error: 'Barcode cannot be empty' };
    }

    const trimmed = barcode.trim();

    // Numeric barcode (6-digit manual barcode)
    if (/^\d+$/.test(trimmed)) {
      if (trimmed.length > 20) {
        return { valid: false, error: 'Barcode is too long (max 20 digits)' };
      }
      // Normalize to 6 digits
      const normalized = this.normalizeBarcode(trimmed);
      return { valid: true, normalized };
    }

    // Alphanumeric barcode
    if (/^[A-Za-z0-9]+$/.test(trimmed)) {
      if (trimmed.length > 50) {
        return { valid: false, error: 'Barcode is too long (max 50 characters)' };
      }
      return { valid: true, normalized: trimmed };
    }

    return { valid: false, error: 'Invalid barcode format. Use only letters and numbers.' };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Validate quantity
   */
  static validateQuantity(qty: any): { valid: boolean; error?: string; value?: number } {
    const num = this.sanitizeNumber(qty);

    if (num === null) {
      return { valid: false, error: 'Quantity must be a number' };
    }

    if (num < 0) {
      return { valid: false, error: 'Quantity cannot be negative' };
    }

    if (num > 999999) {
      return { valid: false, error: 'Quantity is too large' };
    }

    return { valid: true, value: num };
  }
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  barcode: {
    required: true,
    pattern: /^[A-Za-z0-9]+$/,
    minLength: 1,
    maxLength: 50,
  } as ValidationRule,

  quantity: {
    required: true,
    min: 0,
    max: 999999,
    custom: (value: any) => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? 'Quantity must be a number' : null;
    },
  } as ValidationRule,

  itemCode: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[A-Za-z0-9\-_]+$/,
  } as ValidationRule,

  itemName: {
    required: true,
    minLength: 1,
    maxLength: 200,
  } as ValidationRule,

  warehouse: {
    required: true,
    minLength: 1,
    maxLength: 100,
  } as ValidationRule,

  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Za-z0-9_]+$/,
  } as ValidationRule,

  password: {
    required: true,
    minLength: 6,
    maxLength: 100,
  } as ValidationRule,
};
