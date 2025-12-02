/**
 * MRPVariantSelector Component
 * Displays MRP variants and allows selection
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NormalizedMrpVariant } from '@/types/scan';
import { formatMrpValue, MRP_MATCH_TOLERANCE } from '@/constants/scanConstants';

interface MRPVariantSelectorProps {
  variants: NormalizedMrpVariant[];
  currentMrp: number | null;
  parsedMrpValue: number | null;
  onVariantSelect: (variant: NormalizedMrpVariant) => void;
  mrpDifference?: number | null;
  mrpChangePercent?: number | null;
  systemMrp?: number | null;
}

export const MRPVariantSelector: React.FC<MRPVariantSelectorProps> = ({
  variants,
  currentMrp,
  parsedMrpValue,
  onVariantSelect,
  mrpDifference = null,
  mrpChangePercent = null,
  systemMrp = null,
}) => {
  if (variants.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.mrpVariantsContainer}>
        <Text style={styles.mrpVariantsLabel}>Known MRP Values</Text>
        <View style={styles.mrpVariantsChips}>
          {variants.map((variant) => {
            const isSelected =
              parsedMrpValue !== null &&
              Math.abs(variant.value - parsedMrpValue) < MRP_MATCH_TOLERANCE;
            const variantString = variant.value.toFixed(2);
            return (
              <TouchableOpacity
                key={`mrp-variant-${variant.id ?? variant.barcode ?? variantString}`}
                style={[styles.mrpVariantChip, isSelected && styles.mrpVariantChipActive]}
                onPress={() => onVariantSelect(variant)}
              >
                <Text
                  style={[styles.mrpVariantChipText, isSelected && styles.mrpVariantChipTextActive]}
                >
                  ₹{variantString}
                </Text>
                {(variant.label || variant.source) && (
                  <Text
                    style={[styles.mrpVariantChipMeta, isSelected && styles.mrpVariantChipMetaActive]}
                    numberOfLines={1}
                  >
                    {variant.label ?? variant.source}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {mrpDifference !== null &&
        parsedMrpValue !== null &&
        Math.abs(mrpDifference) > 0.0001 &&
        systemMrp !== null && (
          <View style={styles.mrpChangeBox}>
            <Text style={styles.mrpChangeLabel}>MRP Change:</Text>
            <Text
              style={[
                styles.mrpChangeValue,
                mrpDifference > 0 ? styles.mrpIncrease : mrpDifference < 0 ? styles.mrpDecrease : styles.mrpNeutral,
              ]}
            >
              {`₹${systemMrp.toFixed(2)} → ₹${parsedMrpValue.toFixed(2)} (${mrpDifference > 0 ? '+' : ''}${mrpDifference.toFixed(2)}${mrpChangePercent !== null ? ` • ${mrpChangePercent > 0 ? '+' : ''}${mrpChangePercent.toFixed(1)}%` : ''})`}
            </Text>
            <Text style={styles.mrpChangeNotice}>
              MRP change will be submitted only when the value differs.
            </Text>
          </View>
        )}
    </>
  );
};

const styles = StyleSheet.create({
  mrpVariantsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  mrpVariantsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  mrpVariantsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mrpVariantChip: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 80,
    alignItems: 'center',
  },
  mrpVariantChipActive: {
    backgroundColor: '#1a3a1a',
    borderColor: '#3B82F6',
  },
  mrpVariantChipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mrpVariantChipTextActive: {
    color: '#3B82F6',
  },
  mrpVariantChipMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  mrpVariantChipMetaActive: {
    color: '#3B82F6',
  },
  mrpChangeBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  mrpChangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  mrpChangeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mrpIncrease: {
    color: '#4CAF50',
  },
  mrpDecrease: {
    color: '#EF4444',
  },
  mrpNeutral: {
    color: '#fff',
  },
  mrpChangeNotice: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

