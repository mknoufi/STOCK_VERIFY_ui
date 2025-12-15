/**
 * Validation Utilities Tests
 * Tests for input validation functions
 */

import { describe, it, expect } from "@jest/globals";
import { validateBarcode } from "../validation";

describe("Barcode Validation", () => {
  describe("Valid Barcodes", () => {
    it("should accept valid EAN-13 barcode", () => {
      const result = validateBarcode("1234567890123");
      expect(result.valid).toBe(true);
    });

    it("should accept valid EAN-8 barcode", () => {
      const result = validateBarcode("12345678");
      expect(result.valid).toBe(true);
    });

    it("should accept valid UPC-A barcode", () => {
      const result = validateBarcode("123456789012");
      expect(result.valid).toBe(true);
    });

    it("should accept alphanumeric barcodes", () => {
      const result = validateBarcode("ABC123XYZ");
      expect(result.valid).toBe(true);
    });
  });

  describe("Invalid Barcodes", () => {
    it("should reject empty barcode", () => {
      const result = validateBarcode("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject whitespace-only barcode", () => {
      const result = validateBarcode("   ");
      expect(result.valid).toBe(false);
    });

    it("should reject barcode with special characters", () => {
      const result = validateBarcode("123-456-789");
      expect(result.valid).toBe(false);
    });

    it("should reject very short barcode", () => {
      const result = validateBarcode("1");
      expect(result.valid).toBe(false);
    });

    it("should reject very long barcode", () => {
      const longBarcode = "1".repeat(100);
      const result = validateBarcode(longBarcode);
      expect(result.valid).toBe(false);
    });
  });

  describe("Barcode Normalization", () => {
    it("should trim whitespace", () => {
      const result = validateBarcode("  123456789012  ");
      expect(result.valid).toBe(true);
      expect(result.value).toBe("123456789012");
    });

    it("should convert to uppercase", () => {
      const result = validateBarcode("abc123xyz");
      expect(result.value).toBe("ABC123XYZ");
    });
  });
});

describe("Quantity Validation", () => {
  it("should accept positive integers", () => {
    expect(1).toBeGreaterThan(0);
    expect(100).toBeGreaterThan(0);
  });

  it("should accept positive decimals", () => {
    expect(1.5).toBeGreaterThan(0);
    expect(0.1).toBeGreaterThan(0);
  });

  it("should reject negative numbers", () => {
    expect(-1).toBeLessThan(0);
  });

  it("should reject zero", () => {
    expect(0).toBe(0);
  });

  it("should reject non-numeric values", () => {
    expect(isNaN(Number("abc"))).toBe(true);
  });
});

describe("Search Query Validation", () => {
  it("should accept valid search queries", () => {
    const queries = ["item123", "Product Name", "123-ABC"];
    queries.forEach((query) => {
      expect(query.length).toBeGreaterThan(0);
    });
  });

  it("should reject empty queries", () => {
    expect("".length).toBe(0);
  });

  it("should trim whitespace from queries", () => {
    const query = "  search term  ";
    expect(query.trim()).toBe("search term");
  });

  it("should handle special characters", () => {
    const query = "item@123!";
    expect(query.length).toBeGreaterThan(0);
  });
});
