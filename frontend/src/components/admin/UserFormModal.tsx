/**
 * UserFormModal Component - Create/Edit user modal
 * Part of admin panel user management
 */

import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, textStyles, semanticColors } from "../../theme/unified";
import apiClient from "../../services/httpClient";
import * as Haptics from "expo-haptics";

// Types
interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

interface UserFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user?: User | null; // null = create mode, User = edit mode
  availableRoles?: string[];
}

// Password strength requirements
const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "One number", test: (p: string) => /\d/.test(p) },
];

export function UserFormModal({
  visible,
  onClose,
  onSuccess,
  user,
  availableRoles = ["staff", "supervisor", "admin"],
}: UserFormModalProps) {
  const isEditMode = !!user;

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("staff");
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = useCallback(() => {
    setUsername("");
    setEmail("");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setPin("");
    setRole("staff");
    setIsActive(true);
    setError(null);
  }, []);

  // Initialize form when user prop changes
  useEffect(() => {
    if (visible) {
      if (user) {
        setUsername(user.username);
        setEmail(user.email || "");
        setFullName(user.full_name || "");
        setRole(user.role);
        setIsActive(user.is_active);
        // Don't set password in edit mode
        setPassword("");
        setConfirmPassword("");
        setPin("");
      } else {
        resetForm();
      }
    }
  }, [visible, user, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const getPasswordStrength = useCallback((pwd: string) => {
    const passed = PASSWORD_REQUIREMENTS.filter((req) => req.test(pwd));
    return {
      score: passed.length,
      total: PASSWORD_REQUIREMENTS.length,
      requirements: PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        met: req.test(pwd),
      })),
    };
  }, []);

  const validateForm = useCallback((): boolean => {
    setError(null);

    // Username is required
    if (!username.trim()) {
      setError("Username is required");
      return false;
    }

    // Username format check
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3-30 characters, alphanumeric or underscore only");
      return false;
    }

    // Email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password required for new users
    if (!isEditMode && !password) {
      setError("Password is required for new users");
      return false;
    }

    // Password strength for new users or if password is being changed
    if (password) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }

    // PIN format if provided (4-6 digits)
    if (pin && !/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4-6 digits");
      return false;
    }

    return true;
  }, [username, email, password, confirmPassword, pin, isEditMode]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && user) {
        // Update existing user
        const updateData: Record<string, unknown> = {
          email: email || null,
          full_name: fullName || null,
          role,
          is_active: isActive,
        };

        // Only include password if it's being changed
        if (password) {
          updateData.password = password;
        }

        // Only include PIN if it's being changed
        if (pin) {
          updateData.pin = pin;
        }

        await apiClient.put(`/api/users/${user.id}`, updateData);

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert("Success", "User updated successfully", [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              onSuccess?.();
              onClose();
            },
          },
        ]);
      } else {
        // Create new user
        const createData = {
          username: username.toLowerCase(),
          email: email || null,
          full_name: fullName || null,
          password,
          pin: pin || null,
          role,
          is_active: isActive,
        };

        await apiClient.post("/api/users", createData);

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert("Success", `User "${username}" created successfully`, [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              onSuccess?.();
              onClose();
            },
          },
        ]);
      }
    } catch (err: any) {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const errorMessage =
        err?.response?.data?.detail ||
        err?.message ||
        `Failed to ${isEditMode ? "update" : "create"} user`;

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    validateForm,
    isEditMode,
    user,
    username,
    email,
    fullName,
    password,
    pin,
    role,
    isActive,
    resetForm,
    onSuccess,
    onClose,
  ]);

  const passwordStrength = getPasswordStrength(password);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: semanticColors.background.primary,
      borderRadius: radius.xl,
      padding: spacing.lg,
      width: "90%",
      maxWidth: 500,
      maxHeight: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    title: {
      ...textStyles.h3,
      color: semanticColors.text.primary,
    },
    closeButton: {
      padding: spacing.xs,
    },
    scrollContent: {
      flexGrow: 1,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...textStyles.label,
      fontWeight: "600",
      color: semanticColors.text.secondary,
      marginBottom: spacing.sm,
    },
    inputGroup: {
      marginBottom: spacing.md,
    },
    label: {
      ...textStyles.label,
      color: semanticColors.text.primary,
      marginBottom: spacing.xs,
    },
    required: {
      color: colors.error[500],
    },
    input: {
      backgroundColor: semanticColors.background.secondary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...textStyles.body,
      color: semanticColors.text.primary,
      borderWidth: 1,
      borderColor: semanticColors.border.default,
    },
    inputFocused: {
      borderColor: colors.primary[500],
    },
    inputError: {
      borderColor: colors.error[500],
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    passwordInput: {
      flex: 1,
    },
    passwordToggle: {
      position: "absolute",
      right: spacing.md,
      padding: spacing.xs,
    },
    strengthBar: {
      flexDirection: "row",
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    strengthSegment: {
      flex: 1,
      height: 4,
      borderRadius: radius.sm,
      backgroundColor: semanticColors.border.default,
    },
    strengthSegmentFilled: {
      backgroundColor: colors.success[500],
    },
    requirementsList: {
      marginTop: spacing.sm,
    },
    requirement: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    requirementText: {
      ...textStyles.caption,
    },
    requirementMet: {
      color: colors.success[600],
    },
    requirementUnmet: {
      color: semanticColors.text.tertiary,
    },
    roleSelector: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    roleButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: semanticColors.border.default,
      backgroundColor: semanticColors.background.secondary,
    },
    roleButtonActive: {
      borderColor: colors.primary[500],
      backgroundColor: colors.primary[100],
    },
    roleButtonText: {
      ...textStyles.label,
      color: semanticColors.text.secondary,
    },
    roleButtonTextActive: {
      color: colors.primary[700],
      fontWeight: "600",
    },
    statusToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
    },
    statusLabel: {
      ...textStyles.body,
      color: semanticColors.text.primary,
    },
    statusButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    statusActive: {
      backgroundColor: colors.success[500],
    },
    statusInactive: {
      backgroundColor: colors.error[500],
    },
    statusText: {
      ...textStyles.label,
      color: semanticColors.text.secondary,
    },
    errorContainer: {
      backgroundColor: colors.error[50],
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    errorText: {
      ...textStyles.body,
      color: colors.error[700],
      flex: 1,
    },
    footer: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: semanticColors.border.default,
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    cancelButton: {
      backgroundColor: semanticColors.background.secondary,
      borderWidth: 1,
      borderColor: semanticColors.border.default,
    },
    submitButton: {
      backgroundColor: colors.primary[600],
    },
    submitButtonDisabled: {
      backgroundColor: colors.primary[300],
    },
    cancelButtonText: {
      ...textStyles.label,
      fontWeight: "600",
      color: semanticColors.text.secondary,
    },
    submitButtonText: {
      ...textStyles.label,
      fontWeight: "600",
      color: "#fff",
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode ? "Edit User" : "Create New User"}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons
                name="close"
                size={24}
                color={semanticColors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Account Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Information</Text>

              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Username <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor={semanticColors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isEditMode} // Username cannot be changed
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={semanticColors.text.tertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={semanticColors.text.tertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Security Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isEditMode ? "Security (Optional)" : "Security"}
              </Text>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Password {!isEditMode && <Text style={styles.required}>*</Text>}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={
                      isEditMode ? "Leave blank to keep current" : "Enter password"
                    }
                    placeholderTextColor={semanticColors.text.tertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={semanticColors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <>
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthSegment,
                            passwordStrength.score >= i && styles.strengthSegmentFilled,
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.requirementsList}>
                      {passwordStrength.requirements.map((req) => (
                        <View key={req.key} style={styles.requirement}>
                          <Ionicons
                            name={req.met ? "checkmark-circle" : "ellipse-outline"}
                            size={14}
                            color={req.met ? colors.success[500] : semanticColors.text.tertiary}
                          />
                          <Text
                            style={[
                              styles.requirementText,
                              req.met ? styles.requirementMet : styles.requirementUnmet,
                            ]}
                          >
                            {req.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Confirm Password */}
              {password.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Confirm Password <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor={semanticColors.text.tertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {/* PIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quick Access PIN</Text>
                <TextInput
                  style={styles.input}
                  value={pin}
                  onChangeText={(text) => setPin(text.replace(/\D/g, "").slice(0, 6))}
                  placeholder={
                    isEditMode ? "Leave blank to keep current" : "4-6 digit PIN (optional)"
                  }
                  placeholderTextColor={semanticColors.text.tertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Role & Status Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Role & Status</Text>

              {/* Role Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Role <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.roleSelector}>
                  {availableRoles.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleButton, role === r && styles.roleButtonActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === r && styles.roleButtonTextActive,
                        ]}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Status Toggle */}
              <View style={styles.statusToggle}>
                <Text style={styles.statusLabel}>Account Status</Text>
                <TouchableOpacity
                  style={styles.statusButton}
                  onPress={() => setIsActive(!isActive)}
                >
                  <View
                    style={[
                      styles.statusIndicator,
                      isActive ? styles.statusActive : styles.statusInactive,
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {isActive ? "Active" : "Inactive"}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={semanticColors.text.tertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={isEditMode ? "save" : "add"} size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? "Save Changes" : "Create User"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default UserFormModal;
