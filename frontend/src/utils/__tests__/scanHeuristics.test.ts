import { shouldAutoLookupBarcode, shouldDirectLookup } from "../scanHeuristics";

describe("scanHeuristics", () => {
  describe("shouldDirectLookup", () => {
    it("returns true for numeric queries", () => {
      expect(shouldDirectLookup("53")).toBe(true);
      expect(shouldDirectLookup("000123")).toBe(true);
    });

    it("returns true for known barcode prefixes", () => {
      expect(shouldDirectLookup("51ABC")).toBe(true);
      expect(shouldDirectLookup("52XYZ")).toBe(true);
      expect(shouldDirectLookup("53-TEST")).toBe(true);
    });

    it("returns true for short item codes with digits", () => {
      expect(shouldDirectLookup("A1")).toBe(true);
      expect(shouldDirectLookup("BOX_12")).toBe(true);
      expect(shouldDirectLookup("SKU-9")).toBe(true);
    });

    it("returns false for plain text", () => {
      expect(shouldDirectLookup("APPLE")).toBe(false);
      expect(shouldDirectLookup("red shirt")).toBe(false);
    });

    it("trims whitespace", () => {
      expect(shouldDirectLookup("  123  ")).toBe(true);
      expect(shouldDirectLookup("   ")).toBe(false);
    });
  });

  describe("shouldAutoLookupBarcode", () => {
    it("returns true for 6+ digit barcodes", () => {
      expect(shouldAutoLookupBarcode("123456")).toBe(true);
      expect(shouldAutoLookupBarcode("123456789012")).toBe(true);
    });

    it("returns false for shorter or non-numeric values", () => {
      expect(shouldAutoLookupBarcode("12345")).toBe(false);
      expect(shouldAutoLookupBarcode("A12345")).toBe(false);
      expect(shouldAutoLookupBarcode("")).toBe(false);
    });
  });
});

