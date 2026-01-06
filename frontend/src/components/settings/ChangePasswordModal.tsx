/**
 * Change Password Modal Component
 *
 * Modal for changing user password with validation and error handling.
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
  ScrollView,
} from 'react-native';
import { useThemeContext } from "../../theme/ThemeContext";
import { typography } from "../../theme/designTokens";
import { authApi } from '../../services/api/authApi';
import * as Haptics from 'expo-haptics';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Password strength requirements
const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
];

export function ChangePasswordModal({
  visible,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const getPasswordStrength = useCallback((password: string) => {
    const passed = PASSWORD_REQUIREMENTS.filter((req) => req.test(password));
    return {
      score: passed.length,
      total: PASSWORD_REQUIREMENTS.length,
      requirements: PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        met: req.test(password),
      })),
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validate current password
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    // Validate new password length
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    // Check not same as current
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);

      // Success haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Success',
        'Your password has been changed successfully. You may need to log in again on other devices.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      // Error haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const errorMessage =
        err?.response?.data?.detail?.message ||
        'Failed to change password. Please try again.';

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, resetForm, onSuccess, onClose]);

  const passwordStrength = getPasswordStrength(newPassword);
  const isValid = currentPassword && newPassword.length >= 8 && confirmPassword;

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
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    scrollContent: {
      flexGrow: 1,
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
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      padding: 12,
      fontSize: typography.fontSize.md,
      color: colors.text,
    },
    inputError: {
      borderColor: colors.danger,
    },
    showButton: {
      padding: 12,
    },
    showButtonText: {
      fontSize: typography.fontSize.sm,
      color: colors.accent,
    },
    strengthContainer: {
      marginBottom: 16,
    },
    strengthBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginBottom: 8,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    requirementsList: {
      gap: 4,
    },
    requirement: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    requirementIcon: {
      fontSize: 12,
    },
    requirementText: {
      fontSize: typography.fontSize.xs,
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

  const getStrengthColor = () => {
    if (passwordStrength.score === 0) return colors.border;
    if (passwordStrength.score === 1) return colors.danger;
    if (passwordStrength.score === 2) return '#F59E0B';
    if (passwordStrength.score === 3) return '#10B981';
    return colors.success;
  };

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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password with at least 8 characters
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Current Password</Text>
              <View style={[styles.inputWrapper, error?.includes('Current') && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Text style={styles.showButtonText}>
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrapper, error?.includes('New') && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.showButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Text style={styles.showButtonText}>
                    {showNewPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(passwordStrength.score / passwordStrength.total) * 100}%`,
                        backgroundColor: getStrengthColor(),
                      },
                    ]}
                  />
                </View>
                <View style={styles.requirementsList}>
                  {passwordStrength.requirements.map((req) => (
                    <View key={req.key} style={styles.requirement}>
                      <Text
                        style={[
                          styles.requirementIcon,
                          { color: req.met ? colors.success : colors.textSecondary },
                        ]}
                      >
                        {req.met ? '✓' : '○'}
                      </Text>
                      <Text
                        style={[
                          styles.requirementText,
                          { color: req.met ? colors.success : colors.textSecondary },
                        ]}
                      >
                        {req.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={[styles.inputWrapper, error?.includes('match') && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
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
                    Change Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
