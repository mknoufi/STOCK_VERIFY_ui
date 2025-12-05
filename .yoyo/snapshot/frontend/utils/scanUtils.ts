/**
 * Utility functions for scan screen
 * Extracted from scan.tsx for better organization
 */

import { Item, NormalizedMrpVariant } from '../types/scan';

export const normalizeSerialValue = (input: string) => (input ? input.trim().toUpperCase() : '');

export const toNumericMrp = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[₹,\s]/g, '');
    const numericValue = parseFloat(cleaned);
    if (Number.isNaN(numericValue)) {
      return null;
    }
    return numericValue;
  }
  // Handle objects with numeric properties
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('value' in obj && typeof obj.value === 'number') {
      return obj.value;
    }
  }
  return null;
};

export const formatMrpValue = (value: unknown): string => {
  const numericValue = toNumericMrp(value);
  if (numericValue === null) {
    return '';
  }
  return numericValue.toFixed(2);
};

export const normalizeMrpVariant = (input: unknown): NormalizedMrpVariant | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const obj = input as Record<string, unknown>;
  const value = toNumericMrp(obj.value ?? obj.mrp);
  if (value === null) {
    return null;
  }
  return {
    id: typeof obj.id === 'string' ? obj.id : undefined,
    value,
    barcode: typeof obj.barcode === 'string' ? obj.barcode : undefined,
    label: typeof obj.label === 'string' ? obj.label : undefined,
    source: typeof obj.source === 'string' ? obj.source : undefined,
    item_condition: typeof obj.item_condition === 'string' ? obj.item_condition : undefined,
  };
};

export const getNormalizedMrpVariants = (item: Item | null | undefined): NormalizedMrpVariant[] => {
  if (!item) {
    return [];
  }
  const seen = new Map<number, NormalizedMrpVariant>();
  const register = (variant: NormalizedMrpVariant | null) => {
    if (variant && variant.value !== null && variant.value !== undefined) {
      if (!seen.has(variant.value)) {
        seen.set(variant.value, variant);
      }
    }
  };
  if (item.mrp_variants) {
    item.mrp_variants.forEach((v) => {
      const normalized = normalizeMrpVariant(v);
      if (normalized) {
        register(normalized);
      }
    });
  }
  if (item.mrp_history) {
    item.mrp_history.forEach((entry) => {
      const normalized = normalizeMrpVariant(entry);
      if (normalized) {
        register(normalized);
      }
    });
  }
  return Array.from(seen.values()).sort((a, b) => a.value - b.value);
};

export const getDefaultMrpForItem = (item: Item | null | undefined): string => {
  if (!item) {
    return '';
  }
  if (item.mrp) {
    return formatMrpValue(item.mrp);
  }
  const variants = getNormalizedMrpVariants(item);
  if (variants.length > 0) {
    return formatMrpValue(variants[0]?.value);
  }
  return '';
};
