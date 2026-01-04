/**
 * SerialScannerModal - Dedicated scanner for serial numbers
 * Validates scanned codes as serial numbers (not barcodes)
 * Auto-increments quantity when new serials are scanned
 */
import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScanThrottleManager } from "../../config/scannerConfig";
import { validateScannedSerial, normalizeSerialValue } from "../../utils/scanUtils";
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  radius as borderRadius,
} from "../../theme/unified";

interface SerialScannerModalProps {
  visible: boolean;
  existingSerials: string[];
  itemName?: string;
  defaultMrp?: number;
  onSerialScanned: (data: {
    serial_number: string;
    mrp?: number;
    manufacturing_date?: string;
  }) => void;
  onClose: () => void;
}

export const SerialScannerModal: React.FC<SerialScannerModalProps> = ({
  visible,
  existingSerials,
  itemName,
  defaultMrp,
  onSerialScanned,
  onClose,
}) => {
  const throttleManagerRef = useRef<ScanThrottleManager>(
    new ScanThrottleManager()
  );

  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setLastScanned(null);
      setScanFeedback(null);
    }
  }, [visible]);

  // Clear feedback after delay
  React.useEffect(() => {
    if (scanFeedback) {
      const timer = setTimeout(() => setScanFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [scanFeedback]);

  const handleBarcodeScanned = useCallback(
    (data: { data: string }) => {
      const scannedValue = data.data;

      // Check throttle
      if (!throttleManagerRef.current.shouldProcessScan(scannedValue)) {
        return;
      }

      // Validate as serial number (not barcode)
      const validation = validateScannedSerial(scannedValue, existingSerials);

      if (!validation.valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setScanFeedback({
          type: validation.error?.includes("barcode") ? "warning" : "error",
          message: validation.error || "Invalid serial number",
        });
        return;
      }

      // Valid serial - success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const normalizedSerial = normalizeSerialValue(scannedValue);

      setLastScanned(normalizedSerial);
      setScanFeedback({
        type: "success",
        message: `Serial added: ${normalizedSerial}`,
      });

      // Pass to parent with default values
      onSerialScanned({
        serial_number: normalizedSerial,
        mrp: defaultMrp,
        manufacturing_date: undefined,
      });
    },
    [existingSerials, defaultMrp, onSerialScanned]
  );

  const getFeedbackStyle = () => {
    if (!scanFeedback) return styles.feedbackHidden;
    switch (scanFeedback.type) {
      case "success":
        return styles.feedbackSuccess;
      case "error":
        return styles.feedbackError;
      case "warning":
        return styles.feedbackWarning;
      default:
        return styles.feedbackHidden;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "code128",
              "code39",
              "code93",
              "datamatrix",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
            ],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Scan Serial Number</Text>
              {itemName && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {itemName}
                </Text>
              )}
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {existingSerials.length + (lastScanned ? 0 : 0)}
              </Text>
            </View>
          </View>

          {/* Scan Area */}
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Feedback Area */}
          <View style={styles.feedbackContainer}>
            {scanFeedback && (
              <View style={[styles.feedbackBadge, getFeedbackStyle()]}>
                <Ionicons
                  name={
                    scanFeedback.type === "success"
                      ? "checkmark-circle"
                      : scanFeedback.type === "warning"
                      ? "warning"
                      : "close-circle"
                  }
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.feedbackText}>{scanFeedback.message}</Text>
              </View>
            )}
          </View>

          {/* Bottom Info */}
          <View style={styles.bottomInfo}>
            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.primary[400]}
              />
              <Text style={styles.infoText}>
                Scan serial numbers on product labels.{"\n"}
                Quantity auto-increments with each scan.
              </Text>
            </View>

            {existingSerials.length > 0 && (
              <View style={styles.serialsList}>
                <Text style={styles.serialsLabel}>
                  Scanned ({existingSerials.length}):
                </Text>
                <Text style={styles.serialsText} numberOfLines={2}>
                  {existingSerials.slice(-3).join(", ")}
                  {existingSerials.length > 3 ? "..." : ""}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Ionicons name="checkmark" size={24} color={colors.white} />
              <Text style={styles.doneButtonText}>
                Done ({existingSerials.length} serials)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.neutral[300],
    marginTop: 2,
  },
  countBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  scanAreaContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: 280,
    height: 180,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: colors.primary[400],
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: borderRadius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: borderRadius.md,
  },
  feedbackContainer: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  feedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  feedbackHidden: {
    opacity: 0,
  },
  feedbackSuccess: {
    backgroundColor: colors.success[600],
  },
  feedbackError: {
    backgroundColor: colors.error[600],
  },
  feedbackWarning: {
    backgroundColor: colors.warning[600],
  },
  feedbackText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  bottomInfo: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.neutral[300],
    lineHeight: 20,
  },
  serialsList: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  serialsLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.neutral[400],
    marginBottom: 4,
  },
  serialsText: {
    fontSize: fontSize.sm,
    color: colors.white,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  doneButtonText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.white,
  },
});

export default SerialScannerModal;
