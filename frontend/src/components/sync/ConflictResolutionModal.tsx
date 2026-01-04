import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../context/ThemeContext";

export interface ConflictData {
  barcode: string;
  itemName: string;
  localValue: any;
  serverValue: any;
  field: string;
}

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: ConflictData[];
  onResolve: (
    resolutions: { barcode: string; resolution: "local" | "server" }[],
  ) => void;
  onCancel: () => void;
  mode?: "sync" | "locked";
}

export const ConflictResolutionModal: React.FC<
  ConflictResolutionModalProps
> = ({ visible, conflicts, onResolve, onCancel, mode = "sync" }) => {
  const { themeLegacy: theme } = useThemeContext();
  const [resolutions, setResolutions] = React.useState<
    Record<string, "local" | "server">
  >({});

  const handleSelect = (barcode: string, resolution: "local" | "server") => {
    setResolutions((prev) => ({ ...prev, [barcode]: resolution }));
  };

  const handleConfirm = () => {
    const resolutionArray = conflicts.map((c) => ({
      barcode: c.barcode,
      resolution: resolutions[c.barcode] || "server", // Default to server if not selected
    }));
    onResolve(resolutionArray);
  };

  const title = mode === "locked" ? "Resolve Locked Items" : "Sync Conflicts";
  const subtitle =
    mode === "locked"
      ? "These items are temporarily locked due to conflicts. Please resolve them to continue."
      : "The following items were modified on both the server and this device. Please choose which version to keep.";

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.centeredView}>
        <View
          style={[
            styles.modalView,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>

          <ScrollView style={styles.scrollArea}>
            {conflicts.map((conflict) => (
              <View
                key={conflict.barcode}
                style={[
                  styles.conflictItem,
                  { borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.itemName, { color: theme.colors.text }]}>
                  {conflict.itemName}
                </Text>
                <Text
                  style={[
                    styles.barcode,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Barcode: {conflict.barcode}
                </Text>

                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderColor: theme.colors.accent },
                      resolutions[conflict.barcode] === "local" && {
                        backgroundColor: theme.colors.accent + "20",
                      },
                    ]}
                    onPress={() => handleSelect(conflict.barcode, "local")}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: theme.colors.accent },
                      ]}
                    >
                      Keep Local
                    </Text>
                    <Text
                      style={[styles.optionValue, { color: theme.colors.text }]}
                    >
                      {conflict.field}: {String(conflict.localValue)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderColor: theme.colors.success },
                      resolutions[conflict.barcode] === "server" && {
                        backgroundColor: theme.colors.success + "20",
                      },
                    ]}
                    onPress={() => handleSelect(conflict.barcode, "server")}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: theme.colors.success },
                      ]}
                    >
                      Keep Server
                    </Text>
                    <Text
                      style={[styles.optionValue, { color: theme.colors.text }]}
                    >
                      {conflict.field}: {String(conflict.serverValue)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm Resolutions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  scrollArea: {
    marginBottom: 20,
  },
  conflictItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  barcode: {
    fontSize: 12,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  option: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  optionValue: {
    fontSize: 14,
  },
  confirmButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
