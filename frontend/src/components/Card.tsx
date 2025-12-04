/**
 * Card Component - Material Design card
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useTheme } from "../hooks/useTheme";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevation?: number;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  onPress,
  style,
  elevation = 2,
  padding = 16,
}) => {
  const theme = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding,
    marginVertical: 8,
    marginHorizontal: 16,
    ...(elevation > 0 && {
      elevation,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.25,
      shadowRadius: elevation * 2,
    }),
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[cardStyle, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </Component>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
});
