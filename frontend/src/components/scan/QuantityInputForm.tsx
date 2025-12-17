/**
 * QuantityInputForm Component
 * Form for entering counted quantity, damage quantities, MRP, and remarks
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Switch,
  TouchableOpacity,
} from "react-native";
import { Controller, Control, FieldErrors } from "react-hook-form";
import {
  ScanFormData,
  NormalizedMrpVariant,
  WorkflowState,
} from "@/types/scan";
import { MRPVariantSelector } from "./MRPVariantSelector";
import { formatMrpValue } from "@/utils/scanUtils";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface QuantityInputFormProps {
  control: Control<ScanFormData>;
  errors: FieldErrors<ScanFormData>;
  setValue: (name: keyof ScanFormData, value: string) => void;
  mrpVariants: NormalizedMrpVariant[];
  parsedMrpValue: number | null;
  systemMrp: number | null;
  mrpDifference: number | null;
  mrpChangePercent: number | null;
  onActivityReset?: () => void;
  onItemConditionChange?: (condition: string) => void;
  onVariantSelect?: (variant: NormalizedMrpVariant) => void;
  currentItemCondition?: string;
  workflowState: WorkflowState;
  updateWorkflowState: (updates: Partial<WorkflowState>) => void;

  // New props for consolidated UI
  markLocation: string;
  onMarkLocationChange: (text: string) => void;
  manufacturingDate: string;
  onManufacturingDateChange: (date: string) => void;
  remark: string;
  onRemarkChange: (text: string) => void;
  serialCaptureEnabled: boolean;
  onToggleSerialCapture: (enabled: boolean) => void;
}

export const QuantityInputForm: React.FC<QuantityInputFormProps> = React.memo(
  ({
    control,
    errors,
    setValue,
    mrpVariants,
    parsedMrpValue,
    systemMrp,
    mrpDifference,
    mrpChangePercent,
    onActivityReset,
    onItemConditionChange,
    onVariantSelect,
    currentItemCondition = "good",
    workflowState,
    updateWorkflowState,

    markLocation,
    onMarkLocationChange,
    manufacturingDate,
    onManufacturingDateChange,
    remark,
    onRemarkChange,
    serialCaptureEnabled,
    onToggleSerialCapture,
  }) => {
    const [showMrpChange, setShowMrpChange] = useState(false);
    const [showDamage, setShowDamage] = useState(false);
    const [showSerial, setShowSerial] = useState(serialCaptureEnabled);
    const [showMfgDate, setShowMfgDate] = useState(!!manufacturingDate);
    const [showAdditionalDetail, setShowAdditionalDetail] = useState(
      !!remark || !!markLocation,
    );
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleDamageChange = (
      text: string,
      field: "returnableDamageQty" | "nonReturnableDamageQty",
    ) => {
      onActivityReset?.();
      if (text && currentItemCondition === "good" && onItemConditionChange) {
        onItemConditionChange("damaged");
      }
    };

    const toggleSwitch = (
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      value: boolean,
    ) => {
      onActivityReset?.();
      setter(value);
    };

    const handleSerialToggle = (value: boolean) => {
      toggleSwitch(setShowSerial, value);
      onToggleSerialCapture(value);
    };

    return (
      <View style={styles.countingSection}>
        <Text style={styles.sectionTitle}>Enter Count</Text>

        {/* Physical Quantity */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>Physical Quantity</Text>
          <Controller
            control={control}
            name="countedQty"
            rules={{ required: "Physical quantity is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.countInput}
                placeholder="Enter physical quantity"
                placeholderTextColor="#94A3B8"
                onBlur={onBlur}
                onChangeText={(text) => {
                  onActivityReset?.();
                  onChange(text);
                }}
                value={value}
                keyboardType="numeric"
              />
            )}
          />
          {errors.countedQty && (
            <Text style={styles.errorText}>{errors.countedQty.message}</Text>
          )}
        </View>

        {/* Change MRP Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Change MRP</Text>
          <Switch
            value={showMrpChange}
            onValueChange={(val) => toggleSwitch(setShowMrpChange, val)}
            trackColor={{ false: "#334155", true: "#3B82F6" }}
            thumbColor={showMrpChange ? "#fff" : "#94A3B8"}
          />
        </View>

        {showMrpChange && (
          <View style={styles.mrpContainer}>
            <View style={styles.mrpColumn}>
              <Text style={styles.fieldLabel}>New MRP</Text>
              <Controller
                control={control}
                name="mrp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.countInput, styles.mrpInput]}
                    placeholder="New MRP"
                    placeholderTextColor="#94A3B8"
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onActivityReset?.();
                      onChange(text);
                    }}
                    value={value}
                    keyboardType={
                      Platform.OS === "ios" ? "decimal-pad" : "numeric"
                    }
                    returnKeyType="done"
                  />
                )}
              />
            </View>
            <View style={styles.mrpColumn}>
              <Text style={styles.fieldLabel}>Current MRP</Text>
              <View style={[styles.countInput, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>
                  {systemMrp !== null ? formatMrpValue(systemMrp) : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* MRP Variant Selector */}
        {showMrpChange && mrpVariants.length > 0 && onVariantSelect && (
          <MRPVariantSelector
            variants={mrpVariants}
            currentMrp={parsedMrpValue}
            parsedMrpValue={parsedMrpValue}
            onVariantSelect={(variant) => {
              setValue("mrp", formatMrpValue(variant.value));
              onVariantSelect(variant);
            }}
            mrpDifference={mrpDifference}
            mrpChangePercent={mrpChangePercent}
            systemMrp={systemMrp}
          />
        )}

        {/* Damage Quantity Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Damage Quantity</Text>
          <Switch
            value={showDamage}
            onValueChange={(val) => toggleSwitch(setShowDamage, val)}
            trackColor={{ false: "#334155", true: "#3B82F6" }}
            thumbColor={showDamage ? "#fff" : "#94A3B8"}
          />
        </View>

        {showDamage && (
          <View style={styles.damageContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Returnable Damage Qty</Text>
              <Controller
                control={control}
                name="returnableDamageQty"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.countInput,
                      { borderColor: value ? "#FF9800" : "#334155" },
                    ]}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      handleDamageChange(text, "returnableDamageQty");
                    }}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Non-Returnable Damage Qty</Text>
              <Controller
                control={control}
                name="nonReturnableDamageQty"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.countInput,
                      { borderColor: value ? "#EF4444" : "#334155" },
                    ]}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      onChange(text);
                      handleDamageChange(text, "nonReturnableDamageQty");
                    }}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
          </View>
        )}

        {/* Capture Serial Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Capture Serial</Text>
          <Switch
            value={showSerial}
            onValueChange={handleSerialToggle}
            trackColor={{ false: "#334155", true: "#3B82F6" }}
            thumbColor={showSerial ? "#fff" : "#94A3B8"}
          />
        </View>
        {/* Serial input logic is handled by SerialNumberEntry component in parent, but toggle is here */}

        {/* Mfg Date Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Mfg Date</Text>
          <Switch
            value={showMfgDate}
            onValueChange={(val) => toggleSwitch(setShowMfgDate, val)}
            trackColor={{ false: "#334155", true: "#3B82F6" }}
            thumbColor={showMfgDate ? "#fff" : "#94A3B8"}
          />
        </View>

        {showMfgDate && (
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  !manufacturingDate && styles.placeholderText,
                ]}
              >
                {manufacturingDate || "Select Manufacturing Date"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            mode="date"
            value={manufacturingDate ? new Date(manufacturingDate) : new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                onManufacturingDateChange(
                  selectedDate.toISOString().split("T")[0] ?? "",
                );
              }
            }}
          />
        )}

        {/* Additional Detail Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Additional Detail</Text>
          <Switch
            value={showAdditionalDetail}
            onValueChange={(val) => toggleSwitch(setShowAdditionalDetail, val)}
            trackColor={{ false: "#334155", true: "#3B82F6" }}
            thumbColor={showAdditionalDetail ? "#fff" : "#94A3B8"}
          />
        </View>

        {showAdditionalDetail && (
          <View style={styles.additionalDetailContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Mark Location</Text>
              <TextInput
                style={styles.countInput}
                value={markLocation}
                onChangeText={(text) => {
                  onActivityReset?.();
                  onMarkLocationChange(text);
                }}
                placeholder="Specific location marker"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Remark</Text>
              <TextInput
                style={[styles.countInput, styles.remarkInput]}
                value={remark}
                onChangeText={(text) => {
                  onActivityReset?.();
                  onRemarkChange(text);
                }}
                placeholder="Add a remark"
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>
          </View>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.parsedMrpValue === nextProps.parsedMrpValue &&
      prevProps.systemMrp === nextProps.systemMrp &&
      prevProps.mrpDifference === nextProps.mrpDifference &&
      prevProps.currentItemCondition === nextProps.currentItemCondition &&
      prevProps.mrpVariants.length === nextProps.mrpVariants.length &&
      prevProps.workflowState.serialCaptureEnabled ===
        nextProps.workflowState.serialCaptureEnabled &&
      JSON.stringify(prevProps.errors) === JSON.stringify(nextProps.errors) &&
      prevProps.markLocation === nextProps.markLocation &&
      prevProps.manufacturingDate === nextProps.manufacturingDate &&
      prevProps.remark === nextProps.remark
    );
  },
);

QuantityInputForm.displayName = "QuantityInputForm";

const styles = StyleSheet.create({
  countingSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 8,
  },
  countInput: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#E2E8F0",
    fontWeight: "500",
  },
  mrpContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  mrpColumn: {
    flex: 1,
  },
  mrpInput: {
    borderColor: "#3B82F6",
  },
  readOnlyInput: {
    backgroundColor: "#0F172A",
    justifyContent: "center",
  },
  readOnlyText: {
    color: "#94A3B8",
    fontSize: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  damageContainer: {
    marginBottom: 16,
  },
  additionalDetailContainer: {
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  placeholderText: {
    color: "#94A3B8",
  },
  remarkInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
