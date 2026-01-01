export const shouldDirectLookup = (rawQuery: string): boolean => {
  const query = rawQuery.trim();
  if (!query) return false;

  // Numeric-only inputs are treated as barcodes.
  if (/^\d+$/.test(query)) return true;

  // Known barcode prefixes used in this deployment.
  if (query.startsWith("51") || query.startsWith("52") || query.startsWith("53")) {
    return true;
  }

  // Heuristic for item codes (no spaces, short, contains at least one digit).
  if (/^[A-Za-z0-9_-]+$/.test(query) && /\d/.test(query) && query.length <= 12) {
    return true;
  }

  return false;
};

export const shouldAutoLookupBarcode = (rawQuery: string): boolean => {
  const query = rawQuery.trim();
  return /^\d{6,}$/.test(query);
};

