import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";

import { COLORS, SHADOWS } from "../constants/theme";
import { ProInput } from "../components/ProInput";

const STANDARD_WEIGHT_KG = 0.5;
const VARIANCE_THRESHOLD = 0.2; // 20%

type ConditionKey = "Damaged" | "Display Unit" | "Wrong Rack";

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scannedItem, setScannedItem] = useState<{ sku: string; name: string } | null>(null);

  const [count, setCount] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [batchSplit, setBatchSplit] = useState(false);
  const [conditions, setConditions] = useState<Record<ConditionKey, boolean>>({
    Damaged: false,
    "Display Unit": false,
    "Wrong Rack": false,
  });

  const [saving, setSaving] = useState(false);

  const warnedWeightRef = useRef(false);

  const canScan = useMemo(() => {
    return !saving && !scanned;
  }, [saving, scanned]);

  const toggleCondition = (key: ConditionKey) => {
    setConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const parseWeightKg = (value: string): number | null => {
    const cleaned = value.replace(/,/g, ".").trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    if (Number.isNaN(num) || !Number.isFinite(num)) return null;
    return num;
  };

  const checkVarianceGuard = useCallback((): boolean => {
    const w = parseWeightKg(weight);
    if (w == null) return true;

    const delta = Math.abs(w - STANDARD_WEIGHT_KG);
    const deviation = delta / STANDARD_WEIGHT_KG;

    return deviation <= VARIANCE_THRESHOLD;
  }, [weight]);

  const onSave = () => {
    if (saving) return;

    const countTrim = count.trim();
    const weightTrim = weight.trim();

    if (!countTrim || !weightTrim) {
      Alert.alert("Missing Data", "Enter Quantity and Weight");
      return;
    }

    const w = parseWeightKg(weightTrim);
    if (w == null) {
      Alert.alert("Invalid Weight", "Enter a valid weight (kg).", [{ text: "OK" }]);
      return;
    }

    // Variance Guard - alert if > 20%
    if (!checkVarianceGuard()) {
      Alert.alert(
        "⚠️ Weight Mismatch",
        `Standard: ${STANDARD_WEIGHT_KG}kg\nEntered: ${w.toFixed(2)}kg\n\nAre you sure?`,
        [
          { text: "Re-weigh", style: "cancel" },
          { text: "Confirm Override", style: "destructive", onPress: commitSave },
        ]
      );
      return;
    }

    commitSave();
  };

  const commitSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setScanned(false);
      setScannedItem(null);
      setCount("");
      setWeight("");
      setBatchSplit(false);
      setConditions({ Damaged: false, "Display Unit": false, "Wrong Rack": false });
      warnedWeightRef.current = false;
      Alert.alert("Saved", "Log synced to Local DB");
    }, 800);
  };

  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!canScan) return;
    if (!data) return;
    setScanned(true);
    setScannedItem({
      sku: String(data),
      name: 'Samsung LED TV 42"',
    });
  };

  const handleRescan = () => {
    setScanned(false);
    setScannedItem(null);
  };

  const handlePrintRequest = () => {
    Alert.alert("Print Request", "Label request sent to printer queue", [{ text: "OK" }]);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color={COLORS.TEXT_MUTED} />
        <Text style={styles.permText}>Camera Access Needed</Text>
        <Text style={styles.permSubText}>We need camera access to scan barcodes</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Top 40% Camera */}
      <View style={styles.cameraShell}>
        {!scanned ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            onBarcodeScanned={canScan ? onBarcodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "code128"],
            }}
          >
            <View style={styles.layer}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.laser} />

              {/* Camera Overlay Controls */}
              <View style={styles.camControls}>
                <TouchableOpacity
                  style={[styles.roundBtn, torchOn && { backgroundColor: COLORS.INFO }]}
                  onPress={() => setTorchOn(!torchOn)}
                >
                  <Ionicons name={torchOn ? "flash" : "flash-off"} size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roundBtn, { marginTop: 12, backgroundColor: COLORS.WARNING }]}
                  onPress={handlePrintRequest}
                >
                  <Ionicons name="print" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        ) : (
          <View style={styles.successView}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.SUCCESS} />
            <Text style={styles.itemTitle}>{scannedItem?.name}</Text>
            <Text style={styles.skuText}>SKU: {scannedItem?.sku}</Text>
            <TouchableOpacity onPress={handleRescan}>
              <Text style={styles.rescan}>Tap to Rescan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom 60% Form */}
      <ScrollView
        style={styles.deck}
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Row */}
        <View style={styles.deckHeader}>
          <Text style={styles.deckTitle}>Verification</Text>
          <View style={styles.splitToggle}>
            <Text style={styles.labelSmall}>Split Batch</Text>
            <Switch
              value={batchSplit}
              onValueChange={setBatchSplit}
              trackColor={{ false: "#767577", true: COLORS.INFO }}
              thumbColor={batchSplit ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Input Row */}
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <ProInput
              label="Count"
              value={count}
              onChangeText={setCount}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={styles.inputHalf}>
            <ProInput
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              unit="KG"
              placeholder="0.0"
              inputStyle={{ color: COLORS.WARNING }}
            />
          </View>
        </View>

        {/* Condition Toggles */}
        <Text style={styles.label}>Item Condition</Text>
        <View style={styles.chipRow}>
          {(Object.keys(conditions) as ConditionKey[]).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, conditions[c] && styles.chipActive]}
              onPress={() => toggleCondition(c)}
            >
              <Text style={[styles.chipText, conditions[c] && styles.chipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? "SAVING..." : "CONFIRM & SAVE"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Default export for compatibility
export default ScanScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_MAIN,
  },
  cameraShell: {
    height: "40%",
    backgroundColor: COLORS.BG_MAIN,
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: "75%",
    aspectRatio: 1.5,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: COLORS.INFO,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  laser: {
    position: "absolute",
    left: "12.5%",
    right: "12.5%",
    height: 2,
    backgroundColor: COLORS.ERROR,
    opacity: 0.7,
  },
  camControls: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -50,
    alignItems: "center",
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  successView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.BG_CARD,
    padding: 24,
  },
  itemTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  skuText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginTop: 4,
  },
  rescan: {
    color: COLORS.INFO,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
    textDecorationLine: "underline",
  },
  deck: {
    flex: 1,
    backgroundColor: COLORS.BG_MAIN,
  },
  deckHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  deckTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "900",
  },
  splitToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  labelSmall: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  label: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 16,
  },
  inputHalf: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.BG_CARD,
  },
  chipActive: {
    borderColor: COLORS.INFO,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  chipText: {
    color: COLORS.TEXT_MUTED,
    fontWeight: "700",
    fontSize: 12,
  },
  chipTextActive: {
    color: COLORS.TEXT_PRIMARY,
  },
  saveBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.INFO,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    ...SHADOWS.light,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.BG_MAIN,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  permText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
  },
  permSubText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  permBtn: {
    marginTop: 24,
    backgroundColor: COLORS.INFO,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
