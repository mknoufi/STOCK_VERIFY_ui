import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  service: string;
}

const MOCK_LOGS: LogEntry[] = [
  {
    id: "1",
    timestamp: "2023-10-27 10:30:00",
    level: "info",
    message: "User login successful",
    service: "auth",
  },
  {
    id: "2",
    timestamp: "2023-10-27 10:35:00",
    level: "warning",
    message: "High memory usage detected",
    service: "system",
  },
  {
    id: "3",
    timestamp: "2023-10-27 10:40:00",
    level: "error",
    message: "Database connection failed",
    service: "db",
  },
  {
    id: "4",
    timestamp: "2023-10-27 10:45:00",
    level: "info",
    message: "Sync completed",
    service: "sync",
  },
  {
    id: "5",
    timestamp: "2023-10-27 10:50:00",
    level: "info",
    message: "Report generated",
    service: "reports",
  },
];

const LogItem = ({ item }: { item: LogEntry }) => (
  <PremiumCard variant="outlined" style={styles.logItem}>
    <View style={styles.logHeader}>
      <View
        style={[
          styles.levelBadge,
          {
            backgroundColor:
              item.level === "error"
                ? `${modernColors.error.main}20`
                : item.level === "warning"
                  ? `${modernColors.warning.main}20`
                  : `${modernColors.info.main}20`,
          },
        ]}
      >
        <Text
          style={[
            styles.levelText,
            {
              color:
                item.level === "error"
                  ? modernColors.error.main
                  : item.level === "warning"
                    ? modernColors.warning.main
                    : modernColors.info.main,
            },
          ]}
        >
          {item.level.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.timestamp}>{item.timestamp}</Text>
    </View>
    <Text style={styles.message}>{item.message}</Text>
    <Text style={styles.service}>Service: {item.service}</Text>
  </PremiumCard>
);

export default function AdminLogs() {
  const { service } = useLocalSearchParams();
  const logs = service
    ? MOCK_LOGS.filter((log) => log.service === service)
    : MOCK_LOGS;

  return (
    <AdminLayout title="System Logs" screenVariant="scrollable">
      <View style={styles.container}>
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogItem item={item} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false} // Let AdminLayout handle scrolling
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
  listContent: {
    gap: modernSpacing.md,
  } as ViewStyle,
  logItem: {
    padding: modernSpacing.md,
  } as ViewStyle,
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  } as ViewStyle,
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: modernBorderRadius.sm,
  } as ViewStyle,
  levelText: {
    ...modernTypography.label.small,
    fontWeight: "bold",
  } as TextStyle,
  timestamp: {
    ...modernTypography.body.small,
    color: modernColors.text.tertiary,
  } as TextStyle,
  message: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  service: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
  } as TextStyle,
});
