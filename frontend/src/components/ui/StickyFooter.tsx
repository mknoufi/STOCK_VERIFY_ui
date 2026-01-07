import React from "react";
import { View, StyleSheet } from "react-native";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { auroraTheme } from "@/theme/auroraTheme";

interface Props {
  title: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
}

export function StickyFooter({
  title,
  disabled,
  loading,
  onPress,
  testID,
}: Props) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.inner}>
        <PremiumButton
          title={title}
          onPress={onPress}
          disabled={!!disabled}
          loading={!!loading}
          variant="primary"
          size="large"
          fullWidth
          testID={testID}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: auroraTheme.spacing.lg,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  inner: {
    borderRadius: auroraTheme.borderRadius.lg,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
});

export default StickyFooter;
