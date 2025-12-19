import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import type { PowerState } from '../hooks/usePowerSaving';

interface PowerSavingIndicatorProps {
  powerState: PowerState;
  compact?: boolean;
  style?: ViewStyle;
}

const modeConfig = {
  normal: {
    icon: 'battery-full-outline',
    label: 'Optimal performance',
  },
  power_saving: {
    icon: 'battery-half-outline',
    label: 'Power saving active',
  },
  critical: {
    icon: 'battery-dead-outline',
    label: 'Critical battery',
  },
} as const;

const PowerSavingIndicator: React.FC<PowerSavingIndicatorProps> = ({
  powerState,
  compact = false,
  style,
}) => {
  const theme = useTheme();
  const config = modeConfig[powerState.mode];

  const batteryLabel =
    typeof powerState.batteryLevel === 'number'
      ? `${powerState.batteryLevel}%`
      : 'Battery status unavailable';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        compact && styles.compact,
        style,
      ]}
    >
      <Ionicons
        name={config.icon}
        size={compact ? 14 : 18}
        color={
          powerState.mode === 'critical'
            ? theme.colors.error
            : powerState.mode === 'power_saving'
            ? theme.colors.warning
            : theme.colors.success ?? theme.colors.primary
        }
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        {!compact && (
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {config.label}
          </Text>
        )}
        <Text
          style={[
            styles.status,
            {
              color:
                powerState.mode === 'critical'
                  ? theme.colors.error
                  : theme.colors.placeholder,
            },
          ]}
        >
          {batteryLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  icon: {
    opacity: 0.9,
  },
  textContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  status: {
    fontSize: 11,
  },
});

export default PowerSavingIndicator;
