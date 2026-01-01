import React from "react";
import { View, StyleSheet } from "react-native";
import { PremiumButton } from "@/components/premium/PremiumButton"; // Assuming this is already modern or will be
import { useThemeContext } from "../../context/ThemeContext";

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
  const { theme } = useThemeContext();

  return (
    <View
      style={[
        styles.container,
        {
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.overlay || "rgba(0,0,0,0.25)"
        }
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.inner,
          { borderRadius: theme.borderRadius.lg }
        ]}
      >
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
  },
  inner: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
});

export default StickyFooter;
