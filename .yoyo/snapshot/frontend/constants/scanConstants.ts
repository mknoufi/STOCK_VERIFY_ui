/**
 * Constants for scan screen
 * Extracted from scan.tsx for better organization
 */

import { Ionicons } from '@expo/vector-icons';
import { PhotoProofType } from '../types/scan';
import { formatMrpValue } from '../utils/scanUtils';

export const MRP_MATCH_TOLERANCE = 0.01;
export { formatMrpValue };

export const PHOTO_PROOF_TYPES: { value: PhotoProofType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ITEM', label: 'Item', icon: 'cube-outline' },
  { value: 'SHELF', label: 'Shelf', icon: 'layers-outline' },
  { value: 'SERIAL', label: 'Serial', icon: 'pricetag-outline' },
  { value: 'DAMAGE', label: 'Damage', icon: 'warning-outline' },
];

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

