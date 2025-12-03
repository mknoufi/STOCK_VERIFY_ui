import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'default' | 'white' | 'gradient';
}

export function AppLogo({
  size = 'medium',
  showText = true,
  variant = 'default'
}: AppLogoProps) {
  const sizes = {
    small: { icon: 24, text: 14, container: 32 },
    medium: { icon: 32, text: 16, container: 40 },
    large: { icon: 48, text: 20, container: 56 },
  };

  const currentSize = sizes[size];

  const iconColors = {
    default: '#4CAF50',
    white: '#fff',
    gradient: '#4CAF50',
  };

  const textColors = {
    default: '#fff',
    white: '#fff',
    gradient: '#fff',
  };

  return (
    <View style={styles.container}>
      {/* Logo Icon */}
      <View style={[
        styles.iconContainer,
        {
          width: currentSize.container,
          height: currentSize.container,
          backgroundColor: variant === 'gradient' ? 'transparent' : 'rgba(76, 175, 80, 0.1)',
        }
      ]}>
        <Ionicons
          name="cube-outline"
          size={currentSize.icon}
          color={iconColors[variant]}
        />
      </View>

      {/* Company Name */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.companyName, {
            fontSize: currentSize.text + 2,
            color: textColors[variant],
          }]}>
            Lavanya E-Mart
          </Text>
          <Text style={[styles.appName, {
            fontSize: currentSize.text - 2,
            color: textColors[variant],
            opacity: 0.8,
          }]}>
            Stock Verification
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  textContainer: {
    justifyContent: 'center',
  },
  companyName: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  appName: {
    fontWeight: '500',
    marginTop: 2,
  },
});
