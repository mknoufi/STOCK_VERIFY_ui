import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModernCard } from "../ModernCard";
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from "../../styles/modernDesignSystem";

interface RecentIssuesProps {
  issues?: any[];
}

const RecentIssues: React.FC<RecentIssuesProps> = ({ issues = [] }) => {
  if (!issues || issues.length === 0) return null;

  return (
    <ModernCard variant="elevated" title="Recent Issues" icon="warning">
      <View style={styles.list}>
        {issues.slice(0, 5).map((issue: any, idx: number) => (
          <View key={idx} style={styles.item}>
            <Ionicons
              name={
                issue.severity === "high"
                  ? "alert-circle"
                  : issue.severity === "medium"
                    ? "warning"
                    : "information-circle"
              }
              size={20}
              color={
                issue.severity === "high"
                  ? modernColors.error.main
                  : issue.severity === "medium"
                    ? modernColors.warning.main
                    : modernColors.info.main
              }
            />
            <View style={styles.content}>
              <Text style={styles.title}>{issue.title}</Text>
              <Text style={styles.desc}>{issue.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </ModernCard>
  );
};

const styles = StyleSheet.create({
  list: {
    marginTop: modernSpacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: modernSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.neutral[100],
  },
  content: {
    marginLeft: modernSpacing.sm,
    flex: 1,
  },
  title: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  desc: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.xs,
  },
});

export default RecentIssues;
