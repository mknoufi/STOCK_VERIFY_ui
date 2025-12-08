import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from "../../styles/modernDesignSystem";

interface RackProgressCardProps {
  rack: string;
  total: number;
  counted: number;
  percentage: number;
  isSelected?: boolean;
  onPress?: () => void;
}

export const RackProgressCard: React.FC<RackProgressCardProps> = ({
  rack,
  total,
  counted,
  percentage,
  isSelected,
  onPress,
}) => {
  // Determine progress color
  let progressColor = modernColors.primary[500];
  if (percentage >= 100) progressColor = modernColors.success.main;
  else if (percentage < 30) progressColor = modernColors.warning.main;

  return (
    <View style={[styles.container, isSelected && styles.selectedContainer]} onTouchEnd={onPress}>
      <View style={styles.header}>
        <Text style={[styles.rackName, isSelected && styles.selectedText]}>Rack {rack}</Text>
        <Text
          style={[styles.percentage, { color: progressColor }, isSelected && styles.selectedText]}
        >
          {percentage}%
        </Text>
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: progressColor },
          ]}
        />
      </View>

      <Text style={[styles.stats, isSelected && styles.selectedText]}>
        {counted} / {total} items verified
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: modernColors.background.paper, // Fixed: secondary -> paper
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.sm,
    borderWidth: 1,
    borderColor: modernColors.border.medium, // Fixed: border -> border.medium
  },
  selectedContainer: {
    borderColor: modernColors.primary[500], // Fixed: primary -> primary[500]
    backgroundColor: modernColors.background.elevated, // Fixed: tertiary -> elevated
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  },
  rackName: {
    ...modernTypography.h6, // Fixed: lead -> h6
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  percentage: {
    ...modernTypography.body.medium, // Fixed: body -> body.medium
    fontWeight: "bold",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: modernColors.background.elevated,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: modernSpacing.xs,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stats: {
    ...modernTypography.label.medium, // Fixed: caption -> label.medium
    color: modernColors.text.secondary,
    textAlign: "right",
  },
  selectedText: {
    // optional text style for selected state
  },
});
