import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

interface Report {
  id: string;
  title: string;
  description: string;
  lastGenerated: string;
  type: "pdf" | "csv" | "excel";
  icon: keyof typeof Ionicons.glyphMap;
}

const MOCK_REPORTS: Report[] = [
  {
    id: "1",
    title: "Inventory Summary",
    description: "Complete overview of current stock levels",
    lastGenerated: "2023-10-26",
    type: "pdf",
    icon: "document-text",
  },
  {
    id: "2",
    title: "User Activity Log",
    description: "Detailed log of user actions and sessions",
    lastGenerated: "2023-10-25",
    type: "csv",
    icon: "people",
  },
  {
    id: "3",
    title: "System Performance",
    description: "Server load and response time metrics",
    lastGenerated: "2023-10-27",
    type: "excel",
    icon: "pulse",
  },
  {
    id: "4",
    title: "Security Audit",
    description: "Login attempts and security alerts",
    lastGenerated: "2023-10-20",
    type: "pdf",
    icon: "shield-checkmark",
  },
];

const ReportItem = ({ item }: { item: Report }) => (
  <PremiumCard variant="elevated" style={styles.reportCard}>
    <View style={styles.reportContent}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${modernColors.primary[500]}20` },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={24}
          color={modernColors.primary[500]}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportDescription}>{item.description}</Text>
        <Text style={styles.lastGenerated}>
          Last generated: {item.lastGenerated}
        </Text>
      </View>
    </View>
    <View style={styles.actions}>
      <PremiumButton
        title="Download"
        onPress={() => {}}
        variant="secondary"
        size="small"
        icon="download-outline"
      />
    </View>
  </PremiumCard>
);

export default function AdminReports() {
  return (
    <AdminLayout title="System Reports" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Generate and view system reports</Text>
        </View>

        <FlatList
          data={MOCK_REPORTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReportItem item={item} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
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
    marginBottom: modernSpacing.lg,
  } as ViewStyle,
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  } as TextStyle,
  listContent: {
    gap: modernSpacing.md,
  } as ViewStyle,
  reportCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.md,
  } as ViewStyle,
  reportContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: modernSpacing.md,
  } as ViewStyle,
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  textContainer: {
    flex: 1,
  } as ViewStyle,
  reportTitle: {
    ...modernTypography.h6,
    color: modernColors.text.primary,
    marginBottom: 2,
  } as TextStyle,
  reportDescription: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: 4,
  } as TextStyle,
  lastGenerated: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  } as TextStyle,
  actions: {
    marginLeft: modernSpacing.md,
  } as ViewStyle,
});
