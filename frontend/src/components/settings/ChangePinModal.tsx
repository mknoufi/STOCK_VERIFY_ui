/**
 * Change PIN Modal Component
 *
 * Modal for changing user PIN with validation and error handling.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeContext } from "../../theme/ThemeContext";
import { typography } from "../../theme/designTokens";
import { authApi } from '../../services/api/authApi';
import * as Haptics from 'expo-haptics';

interface ChangePinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// PIN validation error codes from backend
const PIN_ERROR_MESSAGES: Record<string, string> = {
  PIN_REQUIRED: 'PIN is required',
  PIN_NOT_NUMERIC: 'PIN must contain only digits',
  PIN_TOO_SHORT: 'PIN must be at least 4 digits',
  PIN_TOO_LONG: 'PIN must be at most 6 digits',
  PIN_ALL_SAME: 'PIN cannot be all the same digit',
  PIN_SEQUENTIAL: 'PIN cannot be a sequential pattern (e.g., 1234)',
  PIN_TOO_COMMON: 'This PIN is too common. Please choose a more secure PIN',
  PIN_SAME_AS_CURRENT: 'New PIN must be different from current PIN',
  PIN_MISMATCH: 'PINs do not match',
  WRONG_CURRENT_PIN: 'Current PIN is incorrect',
  NO_PIN_SET: 'No PIN is set for this account',
};

export function ChangePinModal({
  visible,
  onClose,
  onSuccess,
}: ChangePinModalProps) {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const validateLocalPin = useCallback((pin: string): string | null => {
    if (!pin) return 'PIN is required';
    if (!/^\d+$/.test(pin)) return 'PIN must contain only digits';
    if (pin.length < 4) return 'PIN must be at least 4 digits';
    if (pin.length > 6) return 'PIN must be at most 6 digits';
    return null;
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    // Local validation
    const currentPinError = validateLocalPin(currentPin);
    if (currentPinError) {
      setError(currentPinError);
      return;
    }

    const newPinError = validateLocalPin(newPin);
    if (newPinError) {
      setError(newPinError);
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match');
      return;
    }

    if (currentPin === newPin) {
      setError('New PIN must be different from current PIN');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePin(currentPin, newPin);

      // Success haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', 'Your PIN has been changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onSuccess?.();
            onClose();
          },
        },
      ]);
    } catch (err: any) {
      // Error haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const errorCode = err?.response?.data?.detail?.error_code;
      const errorMessage =
        PIN_ERROR_MESSAGES[errorCode] ||
        err?.response?.data?.detail?.message ||
        'Failed to change PIN. Please try again.';

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPin, newPin, confirmPin, validateLocalPin, resetForm, onSuccess, onClose]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: typography.fontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'center',
      letterSpacing: 8,
    },
    inputError: {
      borderColor: colors.danger,
    },
    error: {
      fontSize: typography.fontSize.sm,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: 16,
      padding: 8,
      backgroundColor: `${colors.danger}15`,
      borderRadius: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.accent,
    },
    submitButtonDisabled: {
      backgroundColor: colors.textSecondary,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: typography.fontSize.md,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    submitButtonText: {
      color: '#FFFFFF',
    },
  });

  const isValid = currentPin.length >= 4 && newPin.length >= 4 && confirmPin.length >= 4;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Change PIN</Text>
          <Text style={styles.subtitle}>
            Enter your current PIN and choose a new one
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current PIN</Text>
            <TextInput
              style={[styles.input, error?.includes('Current') && styles.inputError]}
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New PIN</Text>
            <TextInput
              style={[styles.input, error?.includes('New') && styles.inputError]}
              value={newPin}
              onChangeText={setNewPin}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New PIN</Text>
            <TextInput
              style={[styles.input, error?.includes('match') && styles.inputError]}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              editable={!loading}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!isValid || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.buttonText, styles.submitButtonText]}>
                  Change PIN
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
