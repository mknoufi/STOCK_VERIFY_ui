import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  trendType,
  icon,
  color,
}) => (
  <PremiumCard variant="elevated" style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {trend && (
        <View
          style={[
            styles.trendContainer,
            {
              backgroundColor:
                trendType === "up"
                  ? `${modernColors.success.main}20`
                  : trendType === "down"
                    ? `${modernColors.error.main}20`
                    : `${modernColors.text.secondary}20`,
            },
          ]}
        >
          <Ionicons
            name={
              trendType === "up"
                ? "arrow-up"
                : trendType === "down"
                  ? "arrow-down"
                  : "remove"
            }
            size={12}
            color={
              trendType === "up"
                ? modernColors.success.main
                : trendType === "down"
                  ? modernColors.error.main
                  : modernColors.text.secondary
            }
          />
          <Text
            style={[
              styles.trendText,
              {
                color:
                  trendType === "up"
                    ? modernColors.success.main
                    : trendType === "down"
                      ? modernColors.error.main
                      : modernColors.text.secondary,
              },
            ]}
          >
            {trend}
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
  </PremiumCard>
);

export default function AdminMetrics() {
  return (
    <AdminLayout title="System Metrics" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.lastUpdated}>Last updated: Just now</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.cardWrapper}>
            <MetricCard
              title="Total Users"
              value="1,234"
              trend="+12%"
              trendType="up"
              icon="people"
              color={modernColors.primary[500]}
            />
          </View>
          <View style={styles.cardWrapper}>
            <MetricCard
              title="Active Sessions"
              value="56"
              trend="+5%"
              trendType="up"
              icon="pulse"
              color={modernColors.success.main}
            />
          </View>
          <View style={styles.cardWrapper}>
            <MetricCard
              title="System Load"
              value="24%"
              trend="-2%"
              trendType="down"
              icon="server"
              color={modernColors.info.main}
            />
          </View>
          <View style={styles.cardWrapper}>
            <MetricCard
              title="Error Rate"
              value="0.1%"
              trend="0%"
              trendType="neutral"
              icon="warning"
              color={modernColors.error.main}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: modernSpacing.xl }]}>
          Performance
        </Text>
        <PremiumCard variant="outlined" style={styles.chartPlaceholder}>
          <Ionicons
            name="bar-chart"
            size={48}
            color={modernColors.text.tertiary}
          />
          <Text style={styles.placeholderText}>
            Performance Chart Placeholder
          </Text>
        </PremiumCard>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: modernSpacing.screenPadding,
    paddingBottom: 100,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.md,
  } as ViewStyle,
  sectionTitle: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
  } as TextStyle,
  lastUpdated: {
    ...modernTypography.label.medium,
    color: modernColors.text.secondary,
  } as TextStyle,
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  } as ViewStyle,
  cardWrapper: {
    width: Platform.OS === "web" ? "23%" : "48%",
    minWidth: 150,
    flexGrow: 1,
  } as ViewStyle,
  metricCard: {
    padding: modernSpacing.md,
  } as ViewStyle,
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: modernSpacing.sm,
  } as ViewStyle,
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: modernBorderRadius.full,
    gap: 2,
  } as ViewStyle,
  trendText: {
    ...modernTypography.label.medium,
    fontWeight: "600",
  } as TextStyle,
  metricValue: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  metricTitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  } as TextStyle,
  chartPlaceholder: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    marginTop: modernSpacing.md,
    backgroundColor: `${modernColors.background.paper}80`,
  } as ViewStyle,
  placeholderText: {
    ...modernTypography.body.medium,
    color: modernColors.text.tertiary,
    marginTop: modernSpacing.sm,
  } as TextStyle,
});
