/**
 * Export Reports Screen
 * Refactored to use Deep Ocean Design System
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { getSessions } from "../../src/services/api/api";
import { ExportService } from "../../src/services/exportService";
import { useAutoLogout } from "../../src/hooks/useAutoLogout";
import { LogoutButton } from "../../src/components/LogoutButton";
import {
  ScreenContainer,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";

export default function ExportReports() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [exportType, setExportType] = React.useState<string | null>(null);
  const { resetTimer } = useAutoLogout(true);

  const handleInteraction = () => {
    resetTimer();
  };

  const handleExportStart = (type: string) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setExportType(type);
  };

  const handleExportEnd = () => {
    setLoading(false);
    setExportType(null);
  };

  const exportAllSessions = async () => {
    try {
      handleExportStart("sessions");

      __DEV__ && console.log("📊 [Export] Fetching all sessions for export...");
      const result = await getSessions(1, 10000); // Get all sessions
      const sessions = result.items || [];

      if (sessions.length === 0) {
        Alert.alert("No Data", "No sessions available to export");
        return;
      }

      __DEV__ &&
        console.log("✅ [Export] Exporting", sessions.length, "sessions");
      await ExportService.exportSessions(sessions);

      Alert.alert(
        "Export Successful",
        `Exported ${sessions.length} sessions to Excel file`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("❌ [Export] Session export failed:", error);
      Alert.alert(
        "Export Failed",
        error.message || "Failed to export sessions. Please try again.",
      );
    } finally {
      handleExportEnd();
    }
  };

  const exportSessionDetails = async () => {
    try {
      handleExportStart("details");

      Alert.alert(
        "Export Session Details",
        "This will export detailed count lines for all sessions. Continue?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: handleExportEnd,
          },
          {
            text: "Export",
            onPress: async () => {
              try {
                const result = await getSessions(1, 10000);
                const sessions = result.items || [];

                if (sessions.length === 0) {
                  Alert.alert("No Data", "No sessions available to export");
                  return;
                }

                await ExportService.exportSessionsWithDetails(sessions);
                Alert.alert(
                  "Export Successful",
                  `Exported detailed data for ${sessions.length} sessions`,
                  [{ text: "OK" }],
                );
              } catch (error: any) {
                console.error("❌ [Export] Details export failed:", error);
                Alert.alert(
                  "Export Failed",
                  error.message || "Failed to export details",
                );
              } finally {
                handleExportEnd();
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("❌ [Export] Error:", error);
      handleExportEnd();
    }
  };

  const exportVarianceReport = async () => {
    try {
      handleExportStart("variance");

      const result = await getSessions(1, 10000);
      const sessions = result.items || [];

      if (sessions.length === 0) {
        Alert.alert("No Data", "No sessions available to export");
        return;
      }

      const varianceSessions = sessions.filter(
        (s: any) => Math.abs(s.total_variance || 0) > 0,
      );

      if (varianceSessions.length === 0) {
        Alert.alert("No Variance", "No sessions with variance found");
        return;
      }

      await ExportService.exportVarianceReport(varianceSessions);
      Alert.alert(
        "Export Successful",
        `Exported variance report for ${varianceSessions.length} sessions`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("❌ [Export] Variance report failed:", error);
      Alert.alert(
        "Export Failed",
        error.message || "Failed to export variance report",
      );
    } finally {
      handleExportEnd();
    }
  };

  const exportSummaryReport = async () => {
    try {
      handleExportStart("summary");

      const result = await getSessions(1, 10000);
      const sessions = result.items || [];

      if (sessions.length === 0) {
        Alert.alert("No Data", "No sessions available to export");
        return;
      }

      await ExportService.exportSummaryReport(sessions);
      Alert.alert(
        "Export Successful",
        `Exported summary report with ${sessions.length} sessions`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("❌ [Export] Summary report failed:", error);
      Alert.alert(
        "Export Failed",
        error.message || "Failed to export summary report",
      );
    } finally {
      handleExportEnd();
    }
  };

  const RenderExportCard = ({
    title,
    description,
    icon,
    color,
    onPress,
    type,
    delay,
  }: {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
    type: string;
    delay: number;
  }) => {
    const isLoading = loading && exportType === type;
    const isDisabled = loading && exportType !== type;

    return (
      <Animated.View entering={FadeInDown.delay(delay).springify()}>
        <AnimatedPressable
          onPress={onPress}
          disabled={loading}
          onPressIn={handleInteraction}
          style={{ marginBottom: theme.spacing.md }}
        >
          <GlassCard
            intensity={15}
            padding={theme.spacing.md}
            borderRadius={theme.borderRadius.lg}
            style={isDisabled ? { opacity: 0.5 } : undefined}
          >
            <View style={styles.cardContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${color}20` },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={color} />
                ) : (
                  <Ionicons name={icon} size={28} color={color} />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDescription}>{description}</Text>
              </View>
              <Ionicons
                name="download-outline"
                size={20}
                color={theme.colors.text.tertiary}
                style={styles.actionIcon}
              />
            </View>
          </GlassCard>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <ScreenContainer>
      <StatusBar style="light" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.text.primary}
              />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Data Exports</Text>
              <Text style={styles.pageSubtitle}>
                Generate & Download Reports
              </Text>
            </View>
          </View>
          <LogoutButton variant="icon" size="large" showText={false} />
        </Animated.View>

        {/* Report Cards */}
        <View style={styles.grid}>
          <Text style={styles.sectionTitle}>Available Reports</Text>

          <RenderExportCard
            title="All Sessions"
            description="Complete list of all stock count sessions with basic details"
            icon="documents-outline"
            color={theme.colors.success.main}
            onPress={exportAllSessions}
            type="sessions"
            delay={200}
          />

          <RenderExportCard
            title="Session Details"
            description="Detailed count lines for all sessions including item-level data"
            icon="list-outline"
            color={theme.colors.primary[500]}
            onPress={exportSessionDetails}
            type="details"
            delay={300}
          />

          <RenderExportCard
            title="Variance Report"
            description="Only sessions with stock variance for analysis"
            icon="analytics-outline"
            color={theme.colors.error.main}
            onPress={exportVarianceReport}
            type="variance"
            delay={400}
          />

          <RenderExportCard
            title="Summary Report"
            description="Aggregated statistics and summary across all sessions"
            icon="stats-chart-outline"
            color={theme.colors.warning.main}
            onPress={exportSummaryReport}
            type="summary"
            delay={500}
          />
        </View>

        {/* Info Section */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <View style={styles.infoContainer}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={theme.colors.text.tertiary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Export Information</Text>
              <Text style={styles.infoText}>
                • Reports are generated in Excel format (.xlsx)
              </Text>
              <Text style={styles.infoText}>
                • Files are saved to your device&apos;s Downloads folder
              </Text>
              <Text style={styles.infoText}>
                • Large exports may take a few moments to generate
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pageTitle: {
    fontSize: 32,
    color: theme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  grid: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  actionIcon: {
    opacity: 0.5,
  },
  infoContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  infoTitle: {
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
});
