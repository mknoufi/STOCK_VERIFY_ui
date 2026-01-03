import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { PremiumInput } from "../premium/PremiumInput";
import { PremiumButton } from "../premium/PremiumButton";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernCommonStyles,
} from "../../styles/modernDesignSystem";
import { useScanSessionStore } from "../../store/scanSessionStore";

export const SectionFocusConfig: React.FC = () => {
  const { setFloor, setRack, startSection } =
    useScanSessionStore();
  const [locationType, setLocationType] = useState<'showroom' | 'godown'>('showroom');
  const [selectedFloor, setSelectedFloor] = useState("");
  const [rackInput, setRackInput] = useState("");
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  // Initialize with showroom options to prevent empty list flash
  const [floorOptions, setFloorOptions] = useState<string[]>(["Ground Floor", "First Floor", "Second Floor"]);

  useEffect(() => {
    console.log("Location type changed:", locationType);
    if (locationType === 'showroom') {
      setFloorOptions(["Ground Floor", "First Floor", "Second Floor"]);
    } else {
      setFloorOptions(["Top Godown", "Main Godown", "Damage Area"]);
    }
    setSelectedFloor(""); // Reset floor when type changes
  }, [locationType]);

  const handleOpenModal = () => {
    console.log("Opening floor modal");
    setShowFloorModal(true);
  };

  const handleStartSection = () => {
    if (!selectedFloor || !rackInput.trim()) {
      Alert.alert(
        "Missing Information",
        "Please select a floor and enter a rack number.",
      );
      return;
    }

    setLoading(true);
    // Simulate a brief loading state for UX
    setTimeout(() => {
      setFloor(selectedFloor);
      setRack(rackInput.trim());
      startSection();
      setLoading(false);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.glassContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="scan-circle-outline"
              size={48}
              color={modernColors.primary[400]}
            />
          </View>
          <Text style={styles.title}>New Section</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Choose Location Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                locationType === "showroom" && styles.toggleButtonActive,
              ]}
              onPress={() => setLocationType("showroom")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  locationType === "showroom" && styles.toggleButtonTextActive,
                ]}
              >
                Showroom
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                locationType === "godown" && styles.toggleButtonActive,
              ]}
              onPress={() => setLocationType("godown")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  locationType === "godown" && styles.toggleButtonTextActive,
                ]}
              >
                Godown
              </Text>
            </TouchableOpacity>
          </View>

          {/* Floor Selection */}
          <Text style={styles.label}>Select Floor / Area</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenModal}
            style={styles.dropdownTrigger}
          >
            <View style={styles.fakeInput}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="layers-outline"
                  size={20}
                  color={modernColors.text.tertiary}
                  style={{ marginRight: modernSpacing.xs, padding: modernSpacing.xs }}
                />
                <Text
                  style={
                    selectedFloor
                      ? styles.fakeInputText
                      : styles.fakeInputPlaceholder
                  }
                >
                  {selectedFloor || "Select Floor"}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={20}
                color={modernColors.text.tertiary}
                style={{ padding: modernSpacing.xs }}
              />
            </View>
          </TouchableOpacity>

          {/* Rack Input */}
          <PremiumInput
            label="Rack / Shelf Number"
            value={rackInput}
            onChangeText={setRackInput}
            placeholder="Ex. A-01, Shelf 3"
            leftIcon="grid-outline"
            autoCapitalize="characters"
            style={{ marginTop: modernSpacing.md }}
          />

          <View style={styles.spacer} />

          <PremiumButton
            title="Start Scanning"
            onPress={handleStartSection}
            variant="primary"
            size="large"
            icon="arrow-forward"
            fullWidth
            loading={loading}
            disabled={!selectedFloor || !rackInput}
          />
        </View>
      </BlurView>

      {/* Floor Selection Modal */}
      <Modal
        visible={showFloorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFloorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Floor</Text>
              <TouchableOpacity onPress={() => setShowFloorModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={modernColors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {floorOptions.length > 0 ? (
                floorOptions.map((floor) => (
                  <TouchableOpacity
                    key={floor}
                    style={[
                      styles.optionItem,
                      selectedFloor === floor && styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedFloor(floor);
                      setShowFloorModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedFloor === floor && styles.optionTextSelected,
                      ]}
                    >
                      {floor}
                    </Text>
                    {selectedFloor === floor && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={modernColors.primary[500]}
                      />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ padding: 20, textAlign: "center", color: modernColors.text.secondary }}>
                  No options available
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: modernSpacing.lg,
    backgroundColor: modernColors.background.default,
  },
  glassContainer: {
    borderRadius: modernBorderRadius.xl,
    padding: modernSpacing.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor:
      Platform.OS === "android"
        ? modernColors.background.paper
        : "rgba(30, 41, 59, 0.6)",
  },
  header: {
    alignItems: "center",
    marginBottom: modernSpacing.xl,
  },
  iconContainer: {
    marginBottom: modernSpacing.md,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  title: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
    textAlign: "center",
  },
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: "center",
    maxWidth: "80%",
  },
  form: {
    width: "100%",
  },
  label: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.sm,
    marginLeft: modernSpacing.xs,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: modernBorderRadius.lg,
    padding: 4,
    marginBottom: modernSpacing.lg,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: modernSpacing.md,
    alignItems: "center",
    borderRadius: modernBorderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: modernColors.primary[500],
  },
  toggleButtonText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
  },
  dropdownTrigger: {
    marginBottom: 0,
  },
  fakeInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: modernColors.background.default,
    borderWidth: 1.5,
    borderColor: modernColors.border.light,
    borderRadius: modernBorderRadius.md,
    paddingHorizontal: modernSpacing.sm,
    minHeight: 48,
    marginBottom: modernSpacing.sm,
  },
  fakeInputText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  fakeInputPlaceholder: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
  spacer: {
    height: modernSpacing.xl,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: modernSpacing.lg,
  },
  modalContent: {
    ...modernCommonStyles.cardElevated,
    width: "100%",
    maxWidth: 400,
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  modalTitle: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  modalList: {
    padding: modernSpacing.md,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.md,
    borderRadius: modernBorderRadius.md,
    marginBottom: modernSpacing.xs,
  },
  optionItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  optionText: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
  },
  optionTextSelected: {
    color: modernColors.primary[400],
    fontWeight: "600",
  },
});
