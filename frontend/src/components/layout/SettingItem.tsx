/**
 * Setting Item Component - Individual setting row
 */

import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface SettingItemProps {
  label: string;
  value: any;
  type: 'switch' | 'select' | 'slider' | 'number';
  onValueChange: (value: any) => void;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  label,
  value,
  type,
  onValueChange,
  options = [],
  min,
  max,
  step,
  disabled = false,
  icon,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    if (disabled) return;

    if (type === 'select' && options.length > 0) {
      // Show picker - simplified for now
      const currentIndex = options.findIndex(opt => opt.value === value);
      const nextIndex = (currentIndex + 1) % options.length;
      const nextOption = options[nextIndex];
      if (nextOption) {
        onValueChange(nextOption.value);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: theme.colors.border },
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled || type === 'switch'}
      activeOpacity={0.7}
    >
      <View style={styles.leftContainer}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={disabled ? theme.colors.disabled : theme.colors.primary}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: disabled ? theme.colors.disabled : theme.colors.text },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={styles.rightContainer}>
        {type === 'switch' && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{
              false: theme.colors.disabled,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.background}
          />
        )}

        {type === 'select' && (
          <View style={styles.selectContainer}>
            <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
              {options.find(opt => opt.value === value)?.label || String(value)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.placeholder}
            />
          </View>
        )}

        {(type === 'slider' || type === 'number') && (
          <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
            {String(value)}
            {type === 'slider' && min !== undefined && max !== undefined && (
              <Text style={styles.sliderHint}>
                {' '}({min}-{max})
              </Text>
            )}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 50,
  },
  disabled: {
    opacity: 0.5,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    marginRight: 8,
  },
  sliderHint: {
    fontSize: 12,
    opacity: 0.6,
  },
});
