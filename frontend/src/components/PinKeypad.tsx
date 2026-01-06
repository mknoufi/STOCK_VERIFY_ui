import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinKeypadProps {
  pin: string;
  onPinChange: (pin: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  showPin?: boolean;
  title?: string;
  subtitle?: string;
  errorMessage?: string;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

interface KeypadButtonProps {
  value: string | number;
  onPress: (value: string | number) => void;
  disabled?: boolean;
  isDelete?: boolean;
  isSubmit?: boolean;
  theme?: 'light' | 'dark';
}

const KeypadButton: React.FC<KeypadButtonProps> = ({
  value,
  onPress,
  disabled = false,
  isDelete = false,
  isSubmit = false,
  theme = 'light'
}) => {
  const handlePress = (): void => {
    if (!disabled) {
      Vibration.vibrate(10);
      onPress(value);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[styles.button, theme === 'dark' && styles.darkButton]}
    >
      <Text style={[styles.buttonText, theme === 'dark' && styles.darkButtonText]}>
        {value}
      </Text>
      {isDelete && <Ionicons name="backspace" size={24} color={theme === 'dark' ? 'white' : 'black'} />}
      {isSubmit && <Ionicons name="checkmark" size={24} color={theme === 'dark' ? 'white' : 'black'} />}
    </TouchableOpacity>
  );
};

export const PinKeypad: React.FC<PinKeypadProps> = ({
  pin,
  onPinChange,
  onSubmit,
  maxLength = 4,
  showPin: _showPin = false,
  title,
  subtitle,
  errorMessage,
  disabled = false,
  theme = 'light'
}) => {
  const handleKeyPress = (value: string | number): void => {
    if (typeof value === 'number' && pin.length < maxLength) {
      onPinChange(pin + value.toString());
    }
  };

  const handleDelete = (): void => {
    if (pin.length > 0) {
      onPinChange(pin.slice(0, -1));
    }
  };

  const handleSubmit = (): void => {
    if (pin.length === maxLength) {
      onSubmit();
    }
  };

  return (
    <View style={styles.container}>
      {title && <Text style={[styles.title, theme === 'dark' && styles.darkTitle]}>{title}</Text>}
      {subtitle && <Text style={[styles.subtitle, theme === 'dark' && styles.darkSubtitle]}>{subtitle}</Text>}
      {errorMessage && <Text style={[styles.errorMessage, theme === 'dark' && styles.darkErrorMessage]}>{errorMessage}</Text>}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'delete', 0, 'submit'].map((item) => (
          <KeypadButton
            key={item.toString()}
            value={item}
            onPress={item === 'delete' ? handleDelete : item === 'submit' ? handleSubmit : handleKeyPress}
            disabled={disabled}
            isDelete={item === 'delete'}
            isSubmit={item === 'submit'}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // ...existing styles
  },
  title: {
    // ...existing styles
  },
  subtitle: {
    // ...existing styles
  },
  errorMessage: {
    // ...existing styles
  },
  keypad: {
    // ...existing styles
  },
  button: {
    // ...existing styles
  },
  buttonText: {
    // ...existing styles
  },
  darkButton: {
    // ...dark mode styles
  },
  darkButtonText: {
    // ...dark mode styles
  },
  darkTitle: {
    // ...dark mode styles
  },
  darkSubtitle: {
    // ...dark mode styles
  },
  darkErrorMessage: {
    // ...dark mode styles
  },
});
