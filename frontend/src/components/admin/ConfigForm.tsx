/**
 * ConfigForm Component - Reusable configuration form builder
 * Creates forms dynamically from field definitions
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, textStyles, semanticColors } from "../../theme/unified";

// Field type definitions
export type FieldType = "text" | "number" | "email" | "password" | "toggle" | "select" | "slider" | "textarea";

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: FieldOption[];
  validation?: (value: unknown) => string | null;
}

export interface FormSection {
  id: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
  fields: FormField[];
}

interface ConfigFormProps {
  sections: FormSection[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  style?: ViewStyle;
}

export function ConfigForm({
  sections,
  values,
  onChange,
  errors = {},
  disabled = false,
  style,
}: ConfigFormProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const renderField = (field: FormField) => {
    const value = values[field.key];
    const error = errors[field.key];
    const isDisabled = disabled || field.disabled;

    switch (field.type) {
      case "toggle":
        return (
          <View key={field.key} style={styles.toggleField}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.fieldLabel, isDisabled && styles.labelDisabled]}>
                {field.label}
                {field.required && <Text style={styles.required}> *</Text>}
              </Text>
              {field.description && (
                <Text style={styles.fieldDescription}>{field.description}</Text>
              )}
            </View>
            <Switch
              value={Boolean(value)}
              onValueChange={(v) => onChange(field.key, v)}
              disabled={isDisabled}
              trackColor={{
                false: semanticColors.border.default,
                true: colors.primary[300],
              }}
              thumbColor={value ? colors.primary[500] : semanticColors.background.tertiary}
            />
          </View>
        );

      case "select":
        return (
          <View key={field.key} style={styles.inputField}>
            <Text style={[styles.fieldLabel, isDisabled && styles.labelDisabled]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.selectOption,
                    value === option.value && styles.selectOptionActive,
                    isDisabled && styles.selectOptionDisabled,
                  ]}
                  onPress={() => !isDisabled && onChange(field.key, option.value)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      value === option.value && styles.selectOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case "textarea":
        return (
          <View key={field.key} style={styles.inputField}>
            <Text style={[styles.fieldLabel, isDisabled && styles.labelDisabled]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textareaInput,
                error && styles.inputError,
                isDisabled && styles.inputDisabled,
              ]}
              value={String(value ?? "")}
              onChangeText={(v) => onChange(field.key, v)}
              placeholder={field.placeholder}
              placeholderTextColor={semanticColors.text.tertiary}
              editable={!isDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={false}
            />
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case "number":
        return (
          <View key={field.key} style={styles.inputField}>
            <Text style={[styles.fieldLabel, isDisabled && styles.labelDisabled]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.numberInputContainer}>
              <TouchableOpacity
                style={[styles.numberButton, isDisabled && styles.numberButtonDisabled]}
                onPress={() => {
                  const current = Number(value) || 0;
                  const step = field.step || 1;
                  const min = field.min ?? -Infinity;
                  onChange(field.key, Math.max(min, current - step));
                }}
                disabled={isDisabled}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={isDisabled ? semanticColors.text.tertiary : colors.primary[600]}
                />
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.numberInput,
                  error && styles.inputError,
                  isDisabled && styles.inputDisabled,
                ]}
                value={String(value ?? "")}
                onChangeText={(v) => {
                  const num = parseInt(v, 10);
                  if (!isNaN(num)) {
                    const min = field.min ?? -Infinity;
                    const max = field.max ?? Infinity;
                    onChange(field.key, Math.min(max, Math.max(min, num)));
                  } else if (v === "") {
                    onChange(field.key, "");
                  }
                }}
                placeholder={field.placeholder}
                placeholderTextColor={semanticColors.text.tertiary}
                editable={!isDisabled}
                keyboardType="numeric"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.numberButton, isDisabled && styles.numberButtonDisabled]}
                onPress={() => {
                  const current = Number(value) || 0;
                  const step = field.step || 1;
                  const max = field.max ?? Infinity;
                  onChange(field.key, Math.min(max, current + step));
                }}
                disabled={isDisabled}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={isDisabled ? semanticColors.text.tertiary : colors.primary[600]}
                />
              </TouchableOpacity>
            </View>
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      default: // text, email, password
        return (
          <View key={field.key} style={styles.inputField}>
            <Text style={[styles.fieldLabel, isDisabled && styles.labelDisabled]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.input,
                error && styles.inputError,
                isDisabled && styles.inputDisabled,
              ]}
              value={String(value ?? "")}
              onChangeText={(v) => onChange(field.key, v)}
              placeholder={field.placeholder}
              placeholderTextColor={semanticColors.text.tertiary}
              editable={!isDisabled}
              secureTextEntry={field.type === "password"}
              keyboardType={field.type === "email" ? "email-address" : "default"}
              autoCapitalize={field.type === "email" ? "none" : "none"}
              autoCorrect={false}
            />
            {field.description && (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);

        return (
          <View key={section.id} style={styles.section}>
            {/* Section Header */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                {section.icon && (
                  <View style={styles.sectionIcon}>
                    <Ionicons name={section.icon} size={20} color={colors.primary[600]} />
                  </View>
                )}
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.description && (
                    <Text style={styles.sectionDescription}>{section.description}</Text>
                  )}
                </View>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={semanticColors.text.tertiary}
              />
            </TouchableOpacity>

            {/* Section Content */}
            {isExpanded && (
              <View style={styles.sectionContent}>
                {section.fields.map(renderField)}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ConfigFormActions - Footer buttons for the form
interface ConfigFormActionsProps {
  onSave: () => void;
  onReset?: () => void;
  saving?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function ConfigFormActions({
  onSave,
  onReset,
  saving = false,
  disabled = false,
  style,
}: ConfigFormActionsProps) {
  return (
    <View style={[styles.actionsContainer, style]}>
      {onReset && (
        <TouchableOpacity
          style={[styles.resetButton, disabled && styles.buttonDisabled]}
          onPress={onReset}
          disabled={disabled || saving}
        >
          <Ionicons name="refresh" size={18} color={semanticColors.text.secondary} />
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.saveButton, (disabled || saving) && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={disabled || saving}
      >
        {saving ? (
          <View style={styles.savingIndicator}>
            <Text style={styles.saveButtonText}>Saving...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  section: {
    backgroundColor: semanticColors.background.primary,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: semanticColors.border.default,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: semanticColors.background.secondary,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: semanticColors.text.primary,
  },
  sectionDescription: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
    marginTop: 2,
  },
  sectionContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  inputField: {
    gap: spacing.xs,
  },
  toggleField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  fieldLabel: {
    ...textStyles.label,
    color: semanticColors.text.primary,
  },
  labelDisabled: {
    color: semanticColors.text.tertiary,
  },
  required: {
    color: colors.error[500],
  },
  fieldDescription: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
    marginTop: spacing.xs,
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
  inputError: {
    borderColor: colors.error[500],
  },
  inputDisabled: {
    backgroundColor: semanticColors.background.tertiary,
    color: semanticColors.text.tertiary,
  },
  textareaInput: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  numberInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  numberInput: {
    flex: 1,
    backgroundColor: semanticColors.background.secondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...textStyles.body,
    color: semanticColors.text.primary,
    borderWidth: 1,
    borderColor: semanticColors.border.default,
    textAlign: "center",
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: semanticColors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: semanticColors.border.default,
  },
  numberButtonDisabled: {
    opacity: 0.5,
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: semanticColors.border.default,
    backgroundColor: semanticColors.background.secondary,
  },
  selectOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  selectOptionDisabled: {
    opacity: 0.5,
  },
  selectOptionText: {
    ...textStyles.label,
    color: semanticColors.text.secondary,
  },
  selectOptionTextActive: {
    color: colors.primary[700],
    fontWeight: "600",
  },
  errorText: {
    ...textStyles.caption,
    color: colors.error[600],
    marginTop: spacing.xs,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: semanticColors.border.default,
    backgroundColor: semanticColors.background.primary,
  },
  resetButtonText: {
    ...textStyles.label,
    color: semanticColors.text.secondary,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary[600],
  },
  saveButtonDisabled: {
    backgroundColor: colors.primary[300],
  },
  saveButtonText: {
    ...textStyles.label,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ConfigForm;
