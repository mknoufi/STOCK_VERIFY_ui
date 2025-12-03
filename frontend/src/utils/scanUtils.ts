import { Item, NormalizedMrpVariant } from '../types/scan';

export const normalizeSerialValue = (input: string) => (input ? input.trim().toUpperCase() : '');

export const toNumericMrp = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const candidate = obj.value ?? obj.mrp ?? obj.amount ?? obj.price ?? obj.rate ?? null;

    if (candidate !== null && candidate !== undefined) {
      return toNumericMrp(candidate);
    }

    return null;
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(numericValue)) {
    return null;
  }
  return numericValue;
};

export const formatMrpValue = (value: unknown) => {
  const numericValue = toNumericMrp(value);
  if (numericValue === null) {
    return '';
  }
  return numericValue.toString();
};

export const normalizeMrpVariant = (input: unknown): NormalizedMrpVariant | null => {
  const numericValue = toNumericMrp(input);
  if (numericValue === null) {
    return null;
  }

  const roundedValue = Number(numericValue.toFixed(2));

  if (input && typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    return {
      id: typeof obj.id === 'string' ? obj.id : undefined,
      value: roundedValue,
      barcode:
        typeof obj.barcode === 'string'
          ? obj.barcode
          : typeof obj.variant_barcode === 'string'
          ? obj.variant_barcode
          : undefined,
      label:
        typeof obj.label === 'string'
          ? obj.label
          : typeof obj.title === 'string'
          ? obj.title
          : undefined,
      source:
        typeof obj.source === 'string'
          ? obj.source
          : typeof obj.mrp_source === 'string'
          ? obj.mrp_source
          : undefined,
      item_condition: typeof obj.item_condition === 'string' ? obj.item_condition : undefined,
    };
  }

  return {
    value: roundedValue,
  };
};

export const getNormalizedMrpVariants = (item: Item | null | undefined): NormalizedMrpVariant[] => {
  if (!item) {
    return [];
  }

  const seen = new Map<string, NormalizedMrpVariant>();
  const register = (entry: unknown) => {
    const normalized = normalizeMrpVariant(entry);
    if (!normalized) {
      return;
    }

    const key = `${normalized.value.toFixed(2)}|${normalized.barcode ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, normalized);
      return;
    }

    const existing = seen.get(key)!;
    seen.set(key, {
      ...existing,
      ...normalized,
      id: normalized.id ?? existing.id,
      source: normalized.source ?? existing.source,
      label: normalized.label ?? existing.label,
      item_condition: normalized.item_condition ?? existing.item_condition,
    });
  };

  register(item?.mrp);

  if (Array.isArray(item?.mrp_variants)) {
    item.mrp_variants.forEach(register);
  }

  if (Array.isArray(item?.mrp_history)) {
    item.mrp_history.forEach(register);
  }

  return Array.from(seen.values()).sort((a, b) => a.value - b.value);
};

export const getDefaultMrpForItem = (item: Item | null | undefined): string => {
  if (!item) {
    return '';
  }

  if (Array.isArray(item?.mrp_history) && item.mrp_history.length > 0) {
    const latestEntry = item.mrp_history[item.mrp_history.length - 1];
    const latestValue = toNumericMrp(latestEntry);
    if (latestValue !== null) {
      return formatMrpValue(latestValue);
    }
  }

  const directMrp = toNumericMrp(item?.mrp);
  if (directMrp !== null) {
    return formatMrpValue(directMrp);
  }

  const variants = getNormalizedMrpVariants(item);
  if (variants.length > 0) {
    const lastVariant = variants[variants.length - 1];
    if (lastVariant) {
      return formatMrpValue(lastVariant.value);
    }
  }

  return '';
};

export const SERIAL_REQUIREMENT_LABELS: Record<string, string> = {
  optional: 'Serial capture optional',
  single: 'One serial number required',
  required: 'One serial number required',
  dual: 'Two serial numbers required',
};

export const ITEM_CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'aging', label: 'Aging' },
  { value: 'expired', label: 'Expired' },
  { value: 'packaging_damaged', label: 'Packaging Damaged' },
  { value: 'slow_moving', label: 'Slow Moving' },
];
