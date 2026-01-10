/**
 * ItemAttributesSection Component
 * Displays and manages item attributes like serial numbers, dates, condition
 * Used in item detail entry screens
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { GlassCard } from "../ui/GlassCard";
import { PremiumInput } from "../premium/PremiumInput";
import { PremiumButton } from "../premium/PremiumButton";
import { theme } from "../../styles/modernDesignSystem";

// ============================================================================
// Types
// ============================================================================

export type ConditionType = "New" | "Good" | "Damaged" | "Aging" | "Non-moving" | "Rate Issue" | "Scratches";

export interface AttributeToggleState {
  mfgDate: boolean;
  expiryDate: boolean;
  serialNumbers: boolean;
  damage: boolean;
}

export interface AttributeValues {
  mfgDate?: string;
  expiryDate?: string;
  serialNumbers?: string[];
  condition?: ConditionType;
  damageQty?: number;
  damageRemark?: string;
  nonReturnableDamageQty?: number;
  remark?: string;
}

export interface ItemAttributesSectionProps {
  toggles: AttributeToggleState;
  values: AttributeValues;
  onToggleChange: (key: keyof AttributeToggleState, value: boolean) => void;
  onValueChange: (key: keyof AttributeValues, value: any) => void;
  quantity?: number;
  showConditionPicker?: boolean;
  conditionOptions?: ConditionType[];
  onScanSerial?: (index: number) => void;
  animationDelay?: number;
  style?: any;
}

// ============================================================================
// Sub-Components
// ============================================================================

const ToggleRow: React.FC<{
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onToggle: (value: boolean) => void;
}> = ({ label, icon, value, onToggle }) => {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabelContainer}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={theme.colors.text.secondary}
          />
        )}
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(val) => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onToggle(val);
        }}
        trackColor={{
          false: "rgba(255,255,255,0.1)",
          true: theme.colors.primary[500],
        }}
        thumbColor={Platform.OS === "android" ? "#fff" : undefined}
      />
    </View>
  );
};

const ConditionPicker: React.FC<{
  options: ConditionType[];
  selectedCondition?: ConditionType;
  onSelect: (condition: ConditionType) => void;
}> = ({ options, selectedCondition = "Good", onSelect }) => {
  return (
    <View style={styles.conditionContainer}>
      <Text style={styles.sectionLabel}>Condition</Text>
      <View style={styles.conditionOptions}>
        {options.map((condition) => {
          const isSelected = selectedCondition === condition;
          return (
            <TouchableOpacity
              key={condition}
              style={[
                styles.conditionOption,
                isSelected && styles.conditionOptionActive,
              ]}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.selectionAsync();
                }
                onSelect(condition);
              }}
            >
              <Text
                style={[
                  styles.conditionText,
                  isSelected && styles.conditionTextActive,
                ]}
              >
                {condition}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const SerialNumbersSection: React.FC<{
  serialNumbers: string[];
  onSerialChange: (index: number, value: string) => void;
  onAddSerial: () => void;
  onRemoveSerial: (index: number) => void;
  onScanSerial?: (index: number) => void;
}> = ({ serialNumbers, onSerialChange, onAddSerial, onRemoveSerial, onScanSerial }) => {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.serialSection}>
      {serialNumbers.map((serial, index) => (
        <View key={index} style={styles.serialRow}>
          <View style={[styles.serialInputContainer, styles.serialInput]}>
            <PremiumInput
              label={`Serial #${index + 1}`}
              value={serial}
              onChangeText={(text) => onSerialChange(index, text)}
              placeholder="Scan or enter serial"
              rightIcon={onScanSerial ? "scan-outline" : undefined}
              onRightIconPress={() => onScanSerial?.(index)}
            />
          </View>
          {serialNumbers.length > 1 && (
            <TouchableOpacity
              onPress={() => onRemoveSerial(index)}
              style={styles.removeSerialButton}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.error.main} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <PremiumButton
        title="Add Serial Number"
        onPress={onAddSerial}
        variant="outline"
        size="small"
        icon="add-circle-outline"
      />
    </Animated.View>
  );
};

const DamageSection: React.FC<{
  damageQty?: number;
  damageRemark?: string;
  nonReturnableDamageQty?: number;
  totalQty?: number;
  onDamageQtyChange: (qty: number) => void;
  onDamageRemarkChange: (remark: string) => void;
  onNonReturnableQtyChange: (qty: number) => void;
}> = ({
  damageQty = 0,
  damageRemark = "",
  nonReturnableDamageQty = 0,
  totalQty = 1,
  onDamageQtyChange,
  onDamageRemarkChange,
  onNonReturnableQtyChange,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.damageSection}>
      <View style={styles.damageInputRow}>
        <View style={{ flex: 1 }}>
          <PremiumInput
            label="Damaged Qty"
            value={damageQty.toString()}
            onChangeText={(text) => {
              const qty = parseInt(text) || 0;
              onDamageQtyChange(Math.min(qty, totalQty));
            }}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <View style={{ flex: 1 }}>
          <PremiumInput
            label="Non-returnable Qty"
            value={nonReturnableDamageQty.toString()}
            onChangeText={(text) => {
              const qty = parseInt(text) || 0;
              onNonReturnableQtyChange(Math.min(qty, damageQty));
            }}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </View>
      <PremiumInput
        label="Damage Remark"
        value={damageRemark}
        onChangeText={onDamageRemarkChange}
        placeholder="Describe the damage..."
        multiline
      />
    </Animated.View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemAttributesSection: React.FC<ItemAttributesSectionProps> = ({
  toggles,
  values,
  onToggleChange,
  onValueChange,
  quantity = 1,
  showConditionPicker = true,
  onScanSerial,
  conditionOptions = ["New", "Good", "Damaged"],
  animationDelay = 0,
  style,
}) => {
  const handleAddSerial = () => {
    const current = values.serialNumbers || [""];
    onValueChange("serialNumbers", [...current, ""]);
  };

  const handleRemoveSerial = (index: number) => {
    const current = values.serialNumbers || [];
    onValueChange(
      "serialNumbers",
      current.filter((_, i) => i !== index)
    );
  };

  const handleSerialChange = (index: number, value: string) => {
    const current = values.serialNumbers || [];
    const updated = [...current];
    updated[index] = value;
    onValueChange("serialNumbers", updated);
  };

  const content = (
    <GlassCard
      intensity={15}
      padding={theme.spacing.md}
      borderRadius={theme.borderRadius.lg}
      style={[styles.container, style]}
    >
      <Text style={styles.sectionTitle}>Attributes</Text>

      {/* Manufacturing Date Toggle */}
      <ToggleRow
        label="Manufacturing Date"
        icon="calendar-outline"
        value={toggles.mfgDate}
        onToggle={(val) => onToggleChange("mfgDate", val)}
      />
      {toggles.mfgDate && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.indentedInput}>
          <PremiumInput
            value={values.mfgDate || ""}
            onChangeText={(text) => onValueChange("mfgDate", text)}
            placeholder="YYYY or YYYY-MM or YYYY-MM-DD"
          />
        </Animated.View>
      )}

      {/* Expiry Date Toggle */}
      <ToggleRow
        label="Expiry Date"
        icon="time-outline"
        value={toggles.expiryDate}
        onToggle={(val) => onToggleChange("expiryDate", val)}
      />
      {toggles.expiryDate && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.indentedInput}>
          <PremiumInput
            value={values.expiryDate || ""}
            onChangeText={(text) => onValueChange("expiryDate", text)}
            placeholder="YYYY or YYYY-MM or YYYY-MM-DD"
          />
        </Animated.View>
      )}

      {/* Serial Numbers Toggle */}
      <ToggleRow
        label="Serialized Item"
        icon="barcode-outline"
        value={toggles.serialNumbers}
        onToggle={(val) => {
          onToggleChange("serialNumbers", val);
          if (val && (!values.serialNumbers || values.serialNumbers.length === 0)) {
            // Initialize with empty serial fields based on quantity
            onValueChange("serialNumbers", Array(quantity).fill(""));
          }
        }}
      />
      {toggles.serialNumbers && (
        <SerialNumbersSection
          serialNumbers={values.serialNumbers || [""]}
          onSerialChange={handleSerialChange}          onScanSerial={onScanSerial}          onAddSerial={handleAddSerial}
          onRemoveSerial={handleRemoveSerial}
        />
      )}

      {/* Damage Toggle */}
      <ToggleRow
        label="Report Damage"
        icon="alert-circle-outline"
        value={toggles.damage}
        onToggle={(val) => onToggleChange("damage", val)}
      />
      {toggles.damage && (
        <DamageSection
          damageQty={values.damageQty || 0}
          damageRemark={values.damageRemark || ""}
          nonReturnableDamageQty={values.nonReturnableDamageQty || 0}
          totalQty={quantity}
          onDamageQtyChange={(qty) => onValueChange("damageQty", qty)}
          onDamageRemarkChange={(remark) => onValueChange("damageRemark", remark)}
          onNonReturnableQtyChange={(qty) => onValueChange("nonReturnableDamageQty", qty)}
        />
      )}

      {/* Condition Picker */}
      {showConditionPicker && (
        <ConditionPicker
          options={conditionOptions}
          selectedCondition={values.condition}
          onSelect={(condition) => onValueChange("condition", condition)}
        />
      )}

      {/* General Remark */}
      <View style={styles.remarkSection}>
        <PremiumInput
          label="Remark (Optional)"
          value={values.remark || ""}
          onChangeText={(text) => onValueChange("remark", text)}
          placeholder="Add any notes..."
          multiline
        />
      </View>
    </GlassCard>
  );

  if (animationDelay > 0) {
    return (
      <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
        {content}
      </Animated.View>
    );
  }

  return content;
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  toggleLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  toggleLabel: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  indentedInput: {
    marginLeft: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  conditionContainer: {
    marginTop: theme.spacing.md,
  },
  conditionOptions: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  conditionOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  conditionOptionActive: {
    backgroundColor: theme.colors.primary[500],
  },
  conditionText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
  conditionTextActive: {
    color: "#fff",
  },
  serialSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  serialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  serialInputContainer: {
    flex: 1,
  },
  serialInput: {
    marginBottom: theme.spacing.xs,
  },
  removeSerialButton: {
    padding: 4,
  },
  damageSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  damageInputRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  remarkSection: {
    marginTop: theme.spacing.md,
  },
});

export default ItemAttributesSection;
