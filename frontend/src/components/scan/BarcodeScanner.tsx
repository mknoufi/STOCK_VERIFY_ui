/**
 * BarcodeScanner Component
 * Camera-based barcode scanner with continuous scan mode
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { ScannerMode } from "@/types/scan";

interface BarcodeScannerProps {
  visible: boolean;
  scannerMode: ScannerMode;
  continuousScanMode: boolean;
  isLoadingItem: boolean;
  scanFeedback?: string;
  serialLabel?: string;
  expectedSerialCount: number;
  completedSerialCount: number;
  isWeb: boolean;
  onBarcodeScanned: (data: { data: string }) => void;
  onClose: () => void;
  onToggleContinuousMode: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  scannerMode,
  continuousScanMode,
  isLoadingItem,
  scanFeedback,
  serialLabel,
  expectedSerialCount,
  completedSerialCount,
  isWeb,
  onBarcodeScanned,
  onClose,
  onToggleContinuousMode,
}) => {
  if (isWeb) {
    return null;
  }

  const scannerInstruction =
    scannerMode === "serial"
      ? serialLabel
        ? `Scan serial for ${serialLabel}`
        : "Scan serial number"
      : continuousScanMode
        ? "Scanning continuously - point at barcodes"
        : "Point camera at barcode";

  const scannerSubtext =
    scannerMode === "serial"
      ? expectedSerialCount > 0
        ? `${completedSerialCount}/${expectedSerialCount} captured`
        : "Serial capture enabled"
      : "Supported: EAN, UPC, Code128, QR, and more";

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "pdf417",
              "aztec",
              "ean13",
              "ean8",
              "code128",
              "code39",
              "code93",
              "codabar",
              "upc_a",
              "upc_e",
              "itf14",
              "datamatrix",
            ],
          }}
          onBarcodeScanned={onBarcodeScanned}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerTopBar}>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            {scannerMode === "item" ? (
              <TouchableOpacity
                style={[
                  styles.continuousModeButton,
                  continuousScanMode && styles.continuousModeButtonActive,
                ]}
                onPress={onToggleContinuousMode}
              >
                <Ionicons
                  name={continuousScanMode ? "infinite" : "scan"}
                  size={24}
                  color={continuousScanMode ? "#3B82F6" : "#fff"}
                />
                <Text
                  style={[
                    styles.continuousModeText,
                    continuousScanMode && styles.continuousModeActive,
                  ]}
                >
                  {continuousScanMode ? "Continuous" : "Single"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.serialOverlayRow}>
                <TouchableOpacity
                  style={[
                    styles.continuousModeButton,
                    continuousScanMode && styles.continuousModeButtonActive,
                  ]}
                  onPress={onToggleContinuousMode}
                >
                  <Ionicons
                    name={continuousScanMode ? "infinite" : "scan"}
                    size={22}
                    color={continuousScanMode ? "#3B82F6" : "#fff"}
                  />
                  <Text
                    style={[
                      styles.continuousModeText,
                      continuousScanMode && styles.continuousModeActive,
                    ]}
                  >
                    {continuousScanMode ? "Continuous" : "Single"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.serialOverlayBadge}>
                  <Ionicons name="pricetag-outline" size={18} color="#fff" />
                  <Text style={styles.serialOverlayText}>
                    {serialLabel ?? "Serial capture"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {(scanFeedback || isLoadingItem) && (
            <View
              style={[
                styles.scanFeedbackBanner,
                isLoadingItem && styles.scanFeedbackLoading,
              ]}
            >
              {isLoadingItem ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
              <Text style={styles.scanFeedbackText}>
                {scanFeedback || "Loading..."}
              </Text>
            </View>
          )}

          <View style={styles.scannerFrame}>
            <View style={[styles.scannerCorner, styles.cornerTopLeft]} />
            <View style={[styles.scannerCorner, styles.cornerTopRight]} />
            <View style={[styles.scannerCorner, styles.cornerBottomLeft]} />
            <View style={[styles.scannerCorner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.scannerInstructionContainer}>
            <Text style={styles.scannerText}>{scannerInstruction}</Text>
            <Text style={styles.scannerSubtext}>{scannerSubtext}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scannerTopBar: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeScannerButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 24,
    padding: 12,
  },
  continuousModeButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  continuousModeButtonActive: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderColor: "rgba(76, 175, 80, 0.45)",
  },
  continuousModeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  continuousModeActive: {
    color: "#3B82F6",
  },
  serialOverlayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serialOverlayBadge: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serialOverlayText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  scanFeedbackBanner: {
    position: "absolute",
    top: 120,
    left: 24,
    right: 24,
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  scanFeedbackLoading: {
    backgroundColor: "rgba(33, 150, 243, 0.9)",
  },
  scanFeedbackText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  scannerFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerCorner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderColor: "#3B82F6",
  },
  cornerTopLeft: {
    top: "30%",
    left: "15%",
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: "30%",
    right: "15%",
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: "30%",
    left: "15%",
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: "30%",
    right: "15%",
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerInstructionContainer: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
  },
  scannerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 16,
    borderRadius: 8,
  },
  scannerSubtext: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});
