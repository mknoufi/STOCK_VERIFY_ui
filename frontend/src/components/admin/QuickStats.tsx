import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ModernCard } from "../ui/ModernCard";
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from "../../styles/modernDesignSystem";

interface QuickStatsProps {
  metrics?: any;
  issues?: any[];
}

const QuickStats: React.FC<QuickStatsProps> = ({ metrics, issues = [] }) => {
  return (
    <View style={styles.row}>
      <ModernCard variant="elevated" style={styles.card}>
        <Text style={styles.label}>Active Sessions</Text>
        <Text style={styles.value}>{metrics?.sessions?.active || 0}</Text>
      </ModernCard>

      <ModernCard variant="elevated" style={styles.card}>
        <Text style={styles.label}>Pending Approvals</Text>
        <Text style={styles.value}>{metrics?.sessions?.pending || 0}</Text>
      </ModernCard>

      <ModernCard variant="elevated" style={styles.card}>
        <Text style={styles.label}>Sync Errors</Text>
        <Text style={styles.value}>
          {issues.filter((i: any) => i.type === "sync").length}
        </Text>
      </ModernCard>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    marginRight: modernSpacing.md,
  },
  label: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
  },
  value: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
    marginTop: modernSpacing.sm,
  },
});

export default QuickStats;
