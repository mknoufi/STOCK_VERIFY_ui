import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import apiClient from "../../services/httpClient";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

interface ReportExportProps {
  days: number;
}

export const ReportExport: React.FC<ReportExportProps> = ({ days }) => {
  const { theme } = useTheme();
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const filename = `analytics_report_${new Date().toISOString().split("T")[0]}.pdf`;
      const file = new File(Paths.document, filename);

      // Use axios to download the file
      const response = await apiClient.get(
        `/api/reports/analytics/export/pdf?days=${days}`,
        {
          responseType: "arraybuffer",
          headers: {
            Accept: "application/pdf",
          },
        },
      );

      // Convert arraybuffer to base64
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      await file.write(base64, { encoding: "base64" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        Alert.alert("Success", `Report saved to ${file.uri}`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      Alert.alert("Error", "Failed to export PDF report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleExportPDF}
        disabled={exporting}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.accent,
            opacity: exporting ? 0.7 : 1,
          },
        ]}
      >
        {exporting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Export PDF Report</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
