import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Modal } from "../ui/Modal";
import { PremiumButton } from "../premium/PremiumButton";
import { modernColors, modernTypography, modernSpacing } from "@/styles/modernDesignSystem";

interface BulkEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (barcodes: string[]) => void;
}

export const BulkEntryModal: React.FC<BulkEntryModalProps> = ({ visible, onClose, onSubmit }) => {
  const [inputText, setInputText] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [parsedItems, setParsedItems] = useState<string[]>([]);

  const handleParse = () => {
    if (!inputText.trim()) {
      Alert.alert("Empty Input", "Please enter some barcodes");
      return;
    }

    const items = inputText
      .split(/[\n,]+/) // Split by newline or comma
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const uniqueItems = Array.from(new Set(items)); // Remove duplicates

    if (uniqueItems.length === 0) {
      Alert.alert("No Valid Items", "Could not parse any valid barcodes");
      return;
    }

    setParsedItems(uniqueItems);
    setStep("preview");
  };

  const handleConfirm = () => {
    onSubmit(parsedItems);
    resetAndClose();
  };

  const resetAndClose = () => {
    setInputText("");
    setStep("input");
    setParsedItems([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={resetAndClose}
      title={step === "input" ? "Bulk Entry" : "Review Items"}
    >
      <View style={styles.container}>
        {step === "input" ? (
          <>
            <Text style={styles.helperText}>
              Paste multiple barcodes separated by newlines or commas.
            </Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={10}
              placeholder="E.g.\nITEM001\nITEM002\nITEM003"
              placeholderTextColor={modernColors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
            />
            <View style={styles.footer}>
              <PremiumButton
                title="Cancel"
                variant="secondary"
                onPress={resetAndClose}
                style={styles.button}
              />
              <PremiumButton title="Preview" onPress={handleParse} style={styles.button} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Found <Text style={styles.highlight}>{parsedItems.length}</Text> unique items.
              </Text>
            </View>

            <ScrollView style={styles.listContainer}>
              {parsedItems.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Ionicons name="barcode-outline" size={20} color={modernColors.primary[500]} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <PremiumButton
                title="Back"
                variant="secondary"
                onPress={() => setStep("input")}
                style={styles.button}
              />
              <PremiumButton
                title={`Add All (${parsedItems.length})`}
                onPress={handleConfirm}
                style={styles.button}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: modernSpacing.md,
  },
  helperText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.md,
  },
  textArea: {
    backgroundColor: modernColors.background.default,
    color: modernColors.text.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: modernColors.border.medium,
    padding: modernSpacing.md,
    height: 200,
    marginBottom: modernSpacing.lg,
    ...modernTypography.body.medium,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: modernSpacing.md,
  },
  button: {
    flex: 1,
  },
  summaryContainer: {
    marginBottom: modernSpacing.md,
    padding: modernSpacing.sm,
    backgroundColor: modernColors.background.default,
    borderRadius: 8,
    alignItems: "center",
  },
  summaryText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  highlight: {
    ...modernTypography.h6,
    color: modernColors.primary[500],
  },
  listContainer: {
    maxHeight: 300,
    marginBottom: modernSpacing.lg,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    borderRadius: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: modernSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
    gap: modernSpacing.sm,
  },
  itemText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
});
