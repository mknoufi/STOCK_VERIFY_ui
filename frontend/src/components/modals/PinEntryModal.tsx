import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Modal } from "../ui/Modal";
import { modernColors } from "@/styles/modernDesignSystem";
import { verifyPin } from "@/services/api/api"; // We will add this next

interface PinEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: string; // e.g., "delete_scan"
  staffUsername: string;
  entityId?: string;
}

export const PinEntryModal: React.FC<PinEntryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  action,
  staffUsername,
  entityId,
}) => {
  const [supervisorUsername, setSupervisorUsername] = useState("");
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!supervisorUsername || !pin || !reason) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyPin({
        supervisor_username: supervisorUsername,
        pin,
        action,
        reason,
        staff_username: staffUsername,
        entity_id: entityId,
      });

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError("Invalid credentials or insufficient permissions");
      }
    } catch (err: any) {
      // Handle generic errors or specific 401s
      if (err.message && err.message.includes("401")) {
        setError("Invalid PIN or Username");
      } else if (err.message && err.message.includes("403")) {
        setError("User is not a supervisor");
      } else {
        setError(err.message || "Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSupervisorUsername("");
    setPin("");
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Supervisor Override Required"
    >
      <View style={styles.container}>
        <Text style={styles.description}>
          This action requires supervisor authorization.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Supervisor Username</Text>
          <TextInput
            style={styles.input}
            value={supervisorUsername}
            onChangeText={setSupervisorUsername}
            placeholder="Enter username"
            placeholderTextColor={modernColors.text.secondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter PIN"
            placeholderTextColor={modernColors.text.secondary}
            secureTextEntry
            keyboardType="numeric"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason for Override</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this action needed?"
            placeholderTextColor={modernColors.text.secondary}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
            autoCorrect={false}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Authorize</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  description: {
    color: modernColors.text.secondary,
    marginBottom: 20,
    fontSize: 14,
  },
  errorText: {
    color: modernColors.error.main,
    marginBottom: 15,
    fontSize: 14,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: modernColors.text.primary,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: modernColors.background.elevated, // Was tertiary
    borderRadius: 8,
    padding: 12,
    color: modernColors.text.primary,
    borderWidth: 1,
    borderColor: modernColors.border.light, // Was default
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  primaryButton: {
    backgroundColor: modernColors.primary[500],
  },
  cancelButtonText: {
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
