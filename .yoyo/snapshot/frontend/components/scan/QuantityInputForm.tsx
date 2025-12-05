/**
 * QuantityInputForm Component
 * Form for entering counted quantity, damage quantities, MRP, and remarks
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ScanFormData } from '@/types/scan';
import { MRPVariantSelector } from './MRPVariantSelector';
import { NormalizedMrpVariant } from '@/types/scan';
import { formatMrpValue } from '@/utils/scanUtils';

interface QuantityInputFormProps {
  control: Control<ScanFormData>;
  errors: FieldErrors<ScanFormData>;
  setValue: (name: keyof ScanFormData, value: string) => void;
  mrpVariants: NormalizedMrpVariant[];
  parsedMrpValue: number | null;
  systemMrp: number | null;
  mrpDifference: number | null;
  mrpChangePercent: number | null;
  onActivityReset?: () => void;
  onItemConditionChange?: (condition: string) => void;
  onVariantSelect?: (variant: NormalizedMrpVariant) => void;
  currentItemCondition?: string;
}

export const QuantityInputForm: React.FC<QuantityInputFormProps> = React.memo(({
  control,
  errors,
  setValue,
  mrpVariants,
  parsedMrpValue,
  systemMrp,
  mrpDifference,
  mrpChangePercent,
  onActivityReset,
  onItemConditionChange,
  onVariantSelect,
  currentItemCondition = 'good',
}) => {
  const handleQuickCount = (value: number) => {
    onActivityReset?.();
    setValue('countedQty', value.toString());
  };

  const handleDamageChange = (text: string, field: 'returnableDamageQty' | 'nonReturnableDamageQty') => {
    onActivityReset?.();
    if (text && currentItemCondition === 'good' && onItemConditionChange) {
      onItemConditionChange('damaged');
    }
  };

  return (
    <View style={styles.countingSection}>
      <Text style={styles.sectionTitle}>Enter Count</Text>

      {/* Quick Count Buttons */}
      <View style={styles.quickCountContainer}>
        <Text style={styles.quickCountLabel}>Quick Count:</Text>
        <View style={styles.quickCountButtons}>
          {[1, 5, 10, 20, 50, 100].map((value) => (
            <TouchableOpacity
              key={value}
              style={styles.quickCountButton}
              onPress={() => handleQuickCount(value)}
            >
              <Text style={styles.quickCountButtonText}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Physical Quantity */}
      <Text style={styles.fieldLabel}>Physical Quantity</Text>
      <Controller
        control={control}
        name="countedQty"
        rules={{ required: 'Physical quantity is required' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.countInput}
            placeholder="Enter physical quantity"
            placeholderTextColor="#94A3B8"
            onBlur={onBlur}
            onChangeText={(text) => {
              onActivityReset?.();
              onChange(text);
            }}
            value={value}
            keyboardType="numeric"
          />
        )}
      />
      {errors.countedQty && (
        <Text style={styles.errorText}>{errors.countedQty.message}</Text>
      )}

      {/* Returnable Damage Qty */}
      <Text style={styles.fieldLabel}>Returnable Damage Qty</Text>
      <Controller
        control={control}
        name="returnableDamageQty"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.countInput, { borderColor: value ? '#FF9800' : '#334155' }]}
            placeholder="Enter returnable damage"
            placeholderTextColor="#94A3B8"
            onBlur={onBlur}
            onChangeText={(text) => {
              onChange(text);
              handleDamageChange(text, 'returnableDamageQty');
            }}
            value={value}
            keyboardType="numeric"
          />
        )}
      />

      {/* Non-Returnable Damage Qty */}
      <Text style={styles.fieldLabel}>Non-Returnable Damage Qty</Text>
      <Controller
        control={control}
        name="nonReturnableDamageQty"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.countInput, { borderColor: value ? '#EF4444' : '#334155' }]}
            placeholder="Enter non-returnable damage"
            placeholderTextColor="#94A3B8"
            onBlur={onBlur}
            onChangeText={(text) => {
              onChange(text);
              handleDamageChange(text, 'nonReturnableDamageQty');
            }}
            value={value}
            keyboardType="numeric"
          />
        )}
      />

      {/* MRP Input */}
      <Text style={styles.fieldLabel}>MRP (optional)</Text>
      <Controller
        control={control}
        name="mrp"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.countInput, styles.mrpInput]}
            placeholder="Enter counted MRP"
            placeholderTextColor="#94A3B8"
            onBlur={onBlur}
            onChangeText={(text) => {
              onActivityReset?.();
              onChange(text);
            }}
            value={value}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            returnKeyType="done"
          />
        )}
      />

      {/* MRP Variant Selector */}
      {mrpVariants.length > 0 && onVariantSelect && (
        <MRPVariantSelector
          variants={mrpVariants}
          currentMrp={parsedMrpValue}
          parsedMrpValue={parsedMrpValue}
          onVariantSelect={(variant) => {
            setValue('mrp', formatMrpValue(variant.value));
            onVariantSelect(variant);
          }}
          mrpDifference={mrpDifference}
          mrpChangePercent={mrpChangePercent}
          systemMrp={systemMrp}
        />
      )}

      {/* Remark Input */}
      <Text style={styles.fieldLabel}>Remark (optional)</Text>
      <Controller
        control={control}
        name="remark"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.remarkInput}
            placeholder="Optional remark"
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChange}
            multiline
          />
        )}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if critical props change
  return (
    prevProps.parsedMrpValue === nextProps.parsedMrpValue &&
    prevProps.systemMrp === nextProps.systemMrp &&
    prevProps.mrpDifference === nextProps.mrpDifference &&
    prevProps.currentItemCondition === nextProps.currentItemCondition &&
    prevProps.mrpVariants.length === nextProps.mrpVariants.length &&
    JSON.stringify(prevProps.errors) === JSON.stringify(nextProps.errors)
  );
});

const styles = StyleSheet.create({
  countingSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  quickCountContainer: {
    marginBottom: 16,
  },
  quickCountLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  quickCountButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickCountButton: {
    backgroundColor: '#252525',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 64,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickCountButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 12,
  },
  countInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mrpInput: {
    borderColor: '#3B82F6',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  remarkInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
});
