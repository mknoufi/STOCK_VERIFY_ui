/**
 * VarianceReasonModal Component
 * Modal for selecting variance reason when quantity differs
 */
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { VarianceReason } from "@/types/scan";
import { defaultTheme as theme } from "@/theme/themes";

interface VarianceReasonModalProps {
  visible: boolean;
  reasons: VarianceReason[];
  selectedReason: string | null;
  varianceNote: string;
  onReasonSelect: (reasonCode: string) => void;
  onNoteChange: (note: string) => void;
  onContinue: () => void;
}

export const VarianceReasonModal: React.FC<VarianceReasonModalProps> = ({
  visible,
  reasons,
  selectedReason,
  varianceNote,
  onReasonSelect,
  onNoteChange,
  onContinue,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Variance Reason Required</Text>
          <Text style={styles.modalSubtitle}>
            Please select a reason for the variance
          </Text>

          {reasons.map((reason) => (
            <TouchableOpacity
              key={reason.code}
              style={[
                styles.reasonOption,
                selectedReason === reason.code && styles.reasonSelected,
              ]}
              onPress={() => onReasonSelect(reason.code)}
            >
              <Text style={styles.reasonText}>{reason.label}</Text>
            </TouchableOpacity>
          ))}

          {selectedReason === "other" && (
            <TextInput
              style={styles.noteInput}
              placeholder="Enter reason"
              placeholderTextColor={theme.colors.muted}
              value={varianceNote}
              onChangeText={onNoteChange}
              multiline
            />
          )}

          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedReason && styles.buttonDisabled,
            ]}
            onPress={onContinue}
            disabled={!selectedReason}
          >
            <Text style={styles.confirmButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 24,
  },
  reasonOption: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  reasonSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1a3a1a",
  },
  reasonText: {
    color: "#fff",
    fontSize: 16,
  },
  noteInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    minHeight: 80,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
