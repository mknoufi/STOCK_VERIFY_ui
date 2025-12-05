import React, { useEffect } from "react";
import { View, StyleSheet, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../hooks/useTheme";
import { flags } from "../../constants/flags";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (flags.enableAnimations) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 }),
        ),
        -1,
        false,
      );
    } else {
      progress.value = 0.25;
    }
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.4 * progress.value,
    backgroundColor: theme.colors.surface,
    width,
    height,
    borderRadius,
  }));

  return <Animated.View style={[styles.skeleton, animatedStyle, style]} />;
};

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemHeight = 80,
  spacing = 12,
}) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.listItem, { marginBottom: spacing }]}>
          <Skeleton width={60} height={60} borderRadius={8} />
          <View style={styles.listItemContent}>
            <Skeleton width="70%" height={16} borderRadius={4} />
            <Skeleton
              width="50%"
              height={14}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    // backgroundColor now comes from theme
  },
  list: {
    padding: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
});
