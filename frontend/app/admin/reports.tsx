import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, Platform } from "react-native";
import {
  LoadingSpinner,
  AnimatedPressable,
  ScreenContainer,
} from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import { getAvailableReports, generateReport } from "../../src/services/api";
import { auroraTheme } from "../../src/theme/auroraTheme";

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert("Access Denied", "Admin access required", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }
    loadReports();
  }, [hasRole, router]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await getAvailableReports();
      if (response.success && response.data) {
        setReports(response.data.reports || []);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportId: string) => {
    try {
      setGenerating(reportId);
      const response = await generateReport(reportId, "json");
      if (response.success) {
        Alert.alert(
          "Success",
          `Report '${reportId}' generation started. Check back in a few moments.`,
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "users":
        return "people";
      case "system":
        return "server";
      case "sync":
        return "sync";
      case "logs":
        return "document-text";
      case "audit":
        return "shield-checkmark";
      default:
        return "document";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "users":
        return "#4CAF50";
      case "system":
        return "#007AFF";
      case "sync":
        return "#FF9800";
      case "logs":
        return "#9C27B0";
      case "audit":
        return "#f44336";
      default:
        return "#666";
    }
  };

  if (loading) {
    return (
      <ScreenContainer
        gradient
        header={{
          title: "Reports",
          subtitle: "Generate & Download",
          showBackButton: true,
        }}
      >
        <View style={styles.centered}>
          <LoadingSpinner size={48} color={auroraTheme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      gradient
      scrollable
      header={{
        title: "Reports",
        subtitle: "Generate & Download",
        showBackButton: true,
      }}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.description}>
        Generate and download system reports. Reports are generated in the
        background and can be downloaded when ready.
      </Text>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No reports available</Text>
        </View>
      ) : (
        <View style={styles.reportsList}>
          {reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View
                  style={[
                    styles.reportIconContainer,
                    {
                      backgroundColor: (() => {
                        const color = getCategoryColor(report.category);
                        // Normalize 3-digit hex (#RGB) to 6-digit (#RRGGBB) before adding alpha
                        if (color.length === 4 && color.startsWith("#")) {
                          const r = color[1];
                          const g = color[2];
                          const b = color[3];
                          return `#${r}${r}${g}${g}${b}${b}20`;
                        }
                        return `${color}20`;
                      })(),
                    },
                  ]}
                >
                  <Ionicons
                    name={getCategoryIcon(report.category) as any}
                    size={24}
                    color={getCategoryColor(report.category)}
                  />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportName}>{report.name}</Text>
                  <Text style={styles.reportDescription}>
                    {report.description}
                  </Text>
                  <View style={styles.reportCategory}>
                    <Text
                      style={[
                        styles.reportCategoryText,
                        { color: getCategoryColor(report.category) },
                      ]}
                    >
                      {report.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <AnimatedPressable
                style={[
                  styles.generateButton,
                  generating === report.id && styles.generateButtonDisabled,
                ]}
                onPress={() => handleGenerateReport(report.id)}
                disabled={generating === report.id}
              >
                {generating === report.id ? (
                  <LoadingSpinner size={20} color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download" size={18} color="#fff" />
                    <Text style={styles.generateButtonText}>Generate</Text>
                  </>
                )}
              </AnimatedPressable>
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: auroraTheme.colors.text.primary,
    fontSize: 16,
  },
  contentContainer: {
    padding: auroraTheme.spacing.lg,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginTop: 16,
  },
  reportsList: {
    gap: auroraTheme.spacing.lg,
  },
  reportCard: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    padding: auroraTheme.spacing.lg,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    ...(Platform.OS === "web" && {
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    }),
  },
  reportHeader: {
    flexDirection: "row",
    marginBottom: auroraTheme.spacing.lg,
    gap: auroraTheme.spacing.lg,
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 18,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  reportCategory: {
    alignSelf: "flex-start",
  },
  reportCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: auroraTheme.colors.primary[500],
    padding: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.md,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
