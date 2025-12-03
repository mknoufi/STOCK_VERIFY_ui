/**
 * Date Range Picker Component
 * Fully functional date range selection for reports and analytics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from '@/styles/modernDesignSystem';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  label?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
}) => {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Ionicons name="calendar" size={20} color={modernColors.primary[500]} />
          <View style={styles.dateContent}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
          </View>
        </TouchableOpacity>

        <Ionicons name="arrow-forward" size={20} color={modernColors.text.secondary} />

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Ionicons name="calendar" size={20} color={modernColors.primary[500]} />
          <View style={styles.dateContent}>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (selectedDate && event.type !== 'dismissed') {
              onStartDateChange(selectedDate);
            }
          }}
          maximumDate={endDate}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (selectedDate && event.type !== 'dismissed') {
              onEndDateChange(selectedDate);
            }
          }}
          minimumDate={startDate}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: modernSpacing.md,
  },
  label: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.sm,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: modernSpacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: modernSpacing.sm,
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  dateContent: {
    flex: 1,
  },
  dateLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  dateValue: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: '600',
  },
});
